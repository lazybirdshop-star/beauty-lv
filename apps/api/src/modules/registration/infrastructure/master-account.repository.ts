import { Inject, Injectable } from '@nestjs/common';
import { isValidPublicSlug, toOrganizationSlug } from '@amolie/shared-kernel';
import { and, eq, isNull, sql } from 'drizzle-orm';

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
 * Чем клиентский аккаунт становится мастерским.
 *
 * Те же поля, что и при заведении с нуля, минус адрес почты: он уже принадлежит
 * этому аккаунту и именно им человек подтвердил, что почта его. Меняется всё
 * остальное — имя, телефон и пароль человек задал в заявке заново, и хранить
 * рядом две версии его имени незачем.
 */
export interface MasterPromotionInput {
  fullName: string;
  /** Уже приведён к канону вызывающим (`normalizePhone`). */
  phone: string;
  locale: string;
  passwordHash: string;
  /** Когда человек согласился на обработку данных: подача заявки. */
  consentAt: Date;
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
    if (await this.findLiveByEmail(email)) {
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

      const organization = await this.openSalon(tx, user!, input.fullName);

      return { user: user!, ...organization };
    });
  }

  /**
   * Аккаунт, который уже занимает этот адрес почты.
   *
   * `null` у удалённых: обезличивание снимает с них и почту, и телефон, — так
   * что адрес освобождается вместе с аккаунтом и в выдачу они не попадают.
   */
  async findLiveByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.trim().toLowerCase()), isNull(users.deletedAt)));
    return row ?? null;
  }

  /** Аккаунт по идентификатору — живой, не удалённый. */
  async findLiveById(userId: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
    return row ?? null;
  }

  /** То же для телефона: он тоже уникален, и занят он может быть другим человеком. */
  async findLiveByPhone(phone: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)));
    return row ?? null;
  }

  /**
   * Клиент становится мастером: аккаунт остаётся тот же, к нему добавляется салон.
   *
   * Второй аккаунт на тот же адрес завести нельзя — почта уникальна, — но
   * главное не в этом: у человека уже есть история записей, и мастер, который
   * начинает с чистого листа рядом со своей же историей клиента, — это два
   * человека вместо одного. Поэтому именно повышение, а не заведение.
   *
   * Почта отмечается подтверждённой: сюда приходят только по ссылке из письма,
   * то есть человек только что доказал, что ящик его. Поколение токенов
   * поднимается — прежние сессии выданы клиенту, и роль в них клиентская.
   */
  async promoteToMaster(userId: string, input: MasterPromotionInput): Promise<MasterAccountResult> {
    try {
      return await this.promoteInTransaction(userId, input);
    } catch (error) {
      if (isUniqueViolation(error, 'users_phone_unique')) {
        throw new PhoneTakenError();
      }
      /* Тёзка, зарегистрировавшаяся секундой раньше, могла занять адрес
         страницы. Транзакция откатилась целиком — достаточно взять следующий. */
      if (isUniqueViolation(error, 'organizations_slug_unique')) {
        return this.promoteInTransaction(userId, input);
      }
      throw error;
    }
  }

  private promoteInTransaction(
    userId: string,
    input: MasterPromotionInput,
  ): Promise<MasterAccountResult> {
    return this.db.transaction(async (tx) => {
      const now = new Date();

      const [user] = await tx
        .update(users)
        .set({
          fullName: input.fullName.trim(),
          phone: input.phone,
          locale: input.locale,
          passwordHash: input.passwordHash,
          systemRole: 'master',
          emailVerifiedAt: now,
          /* Согласие клиент дал, когда заводил свой аккаунт; заявка — второе
             согласие того же человека, и переписывать им первое незачем. */
          gdprConsentAt: sql`coalesce(${users.gdprConsentAt}, ${input.consentAt})`,
          tokenVersion: sql`${users.tokenVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();

      const organization = await this.openSalon(tx, user!, input.fullName);

      return { user: user!, ...organization };
    });
  }

  /** Салон и владение им — одинаково у заведённого с нуля и у повышенного. */
  private async openSalon(
    tx: Database,
    user: UserRow,
    name: string,
  ): Promise<{ organizationId: string; organizationSlug: string }> {
    const slug = await this.reserveSlug(tx, toOrganizationSlug(name));

    const [organization] = await tx
      .insert(organizations)
      .values({
        ownerUserId: user.id,
        name: name.trim(),
        slug,
        type: 'solo',
        contactEmail: user.email,
        /* Язык страницы — тот, что мастер назвала в заявке. Без этой строки
           срабатывало умолчание колонки (`ru`), и свежесозданный мастер,
           заполнивший заявку по-английски, получал английскую биографию
           внутри русской публичной страницы. Язык аккаунта у неё уже есть —
           спрашивать его второй раз незачем. */
        defaultLocale: user.locale,
      })
      .returning({ id: organizations.id, slug: organizations.slug });

    await tx.insert(organizationMembers).values({
      organizationId: organization!.id,
      userId: user.id,
      role: 'owner',
    });

    return { organizationId: organization!.id, organizationSlug: organization!.slug };
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
