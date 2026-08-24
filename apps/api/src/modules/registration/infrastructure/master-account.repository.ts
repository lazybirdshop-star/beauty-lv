import { Inject, Injectable } from '@nestjs/common';
import { isValidPublicSlug, toOrganizationSlug } from '@amolie/shared-kernel';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizationSlugHistory } from '../../../shared/database/schema/organization-slug-history';
import { organizations } from '../../../shared/database/schema/organizations';
import { users, type UserRow } from '../../../shared/database/schema/users';
import { isUniqueViolation } from '../../../shared/database/unique-violation';

export class EmailTakenError extends Error {
  constructor() {
    super('Этот email уже зарегистрирован');
  }
}

export class PhoneTakenError extends Error {
  constructor() {
    super('Этот телефон уже зарегистрирован');
  }
}

/**
 * A Postgres unique-violation (23505) against a named constraint.
 *
 * Matched by name rather than treated as one undifferentiated conflict: a
 * duplicate email means "this account exists, sign in instead", while a
 * duplicate slug means "two people picked the same public address, try again",
 * and answering one with the other's message would send a master down the
 * wrong path.
 */

export interface MasterAccountInput {
  fullName: string;
  email: string;
  /** Уже приведён к канону вызывающим (`normalizePhone`). */
  phone: string;
  locale: string;
  passwordHash: string;
  /** Когда человек согласился на обработку данных: подача заявки, а не одобрение. */
  consentAt?: Date;
}

export interface MasterAccountResult {
  user: UserRow;
  organizationId: string;
  organizationSlug: string;
}

/**
 * Заведение аккаунта мастера: пользователь, организация и членство в ней.
 *
 * Раньше жил в модуле входа и был неотделим от инвайт-кода — код гасился той
 * же транзакцией. Кодов больше нет, а создавать аккаунт нужно из двух мест:
 * при открытой регистрации и при одобрении заявки. Поэтому это отдельный
 * кирпич, ничего не знающий о том, кто и почему решил его позвать.
 */
@Injectable()
export class MasterAccountRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Всё или ничего: пользователь, организация и членство появляются одной
   * транзакцией.
   *
   * Наполовину заведённый мастер — человек без организации — попал бы в
   * кабинет, который перенаправляет в никуда, и починить это можно было бы
   * только руками в базе.
   */
  async create(input: MasterAccountInput): Promise<MasterAccountResult> {
    const email = input.email.trim().toLowerCase();

    /* A courtesy check, not the guarantee. Two people registering the same
       address simultaneously would both pass it — the unique index on
       `users.email` is what actually decides, and the loser is turned into
       EmailTakenError below rather than being allowed to surface as a 500. */
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      throw new EmailTakenError();
    }

    try {
      return await this.registerInTransaction(input, email);
    } catch (error) {
      if (isUniqueViolation(error, 'users_email_unique')) {
        throw new EmailTakenError();
      }
      if (isUniqueViolation(error, 'users_phone_unique')) {
        throw new PhoneTakenError();
      }
      /* Две тёзки, регистрирующиеся одновременно, могут занять один и тот же
         адрес. Ничего не потеряно — транзакция откатилась целиком, — и
         достаточно попробовать ещё раз, что здесь и делается. */
      if (isUniqueViolation(error, 'organizations_slug_unique')) {
        return this.registerInTransaction(input, email);
      }
      throw error;
    }
  }

  private registerInTransaction(
    input: MasterAccountInput,
    email: string,
  ): Promise<MasterAccountResult> {
    return this.db.transaction(async (tx) => {
      const now = new Date();

      const [user] = await tx
        .insert(users)
        .values({
          email,
          phone: input.phone,
          locale: input.locale,
          fullName: input.fullName.trim(),
          passwordHash: input.passwordHash,
          systemRole: 'master',
          /* Согласие даётся в момент подачи заявки — им человек и соглашается
             на обработку. Поле заполняется здесь, а не оставляется пустым «на
             потом»: пустое согласие невозможно отличить от неполученного. */
          gdprConsentAt: input.consentAt ?? now,
        })
        .returning();

      const slug = await this.reserveSlug(tx, toOrganizationSlug(input.fullName));

      const [organization] = await tx
        .insert(organizations)
        .values({
          ownerUserId: user!.id,
          name: input.fullName.trim(),
          slug,
          type: 'solo',
          contactEmail: email,
        })
        .returning({ id: organizations.id, slug: organizations.slug });

      await tx.insert(organizationMembers).values({
        organizationId: organization!.id,
        userId: user!.id,
        role: 'owner',
      });

      return {
        user: user!,
        organizationId: organization!.id,
        organizationSlug: organization!.slug,
      };
    });
  }

  /**
   * `alisa-ozola`, then `alisa-ozola-2`, `-3`… — the slug is a public address,
   * so collisions must resolve, not fail.
   *
   * Three things can make a candidate unusable, and all three are handled the
   * same way — try the next suffix:
   *
   * - it belongs to another organization;
   * - it belongs to an organization that *used* to answer to it (the history
   *   table), and handing it to someone else would redirect her clients to a
   *   stranger;
   * - it is not a legal public address at all — reserved (`Salon Admin` →
   *   `admin`) or too short (`Li` → `li`). The suffix fixes both.
   */
  private async reserveSlug(tx: Database, base: string): Promise<string> {
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      if (!isValidPublicSlug(candidate)) continue;
      const [taken] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, candidate));
      const [released] = await tx
        .select({ id: organizationSlugHistory.id })
        .from(organizationSlugHistory)
        .where(eq(organizationSlugHistory.slug, candidate));
      if (!taken && !released) return candidate;
    }
    // 50 masters sharing one name is not a case worth silently degrading.
    throw new Error(`Не удалось подобрать свободный адрес страницы для «${base}»`);
  }
}
