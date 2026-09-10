import { Inject, Injectable } from '@nestjs/common';
import type { OrgRole } from '@amolie/shared-kernel';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { users, type UserRow } from '../../../shared/database/schema/users';

export interface EmployeeAccountInput {
  email: string;
  fullName: string;
  /** Уже приведён к канону (`normalizePhone`) вызывающим. */
  phone: string;
  locale: string;
  passwordHash: string;
}

/**
 * Аккаунт человека, который приходит **в чужой** салон.
 *
 * Отдельно от `MasterAccountRepository`, и это не дубль. Тот заводит мастера
 * вместе с её собственным салоном — пользователь, организация и владение
 * одной транзакцией. Приглашённой сотруднице салон не нужен: он уже есть, и
 * открыть ей второй значило бы завести пустое заведение с публичным адресом,
 * которое никто не просил и которое потом видно в каталоге.
 *
 * Отсюда же следует, что `system_role = 'master'` у человека может не быть ни
 * одной собственной организации. Это законное состояние: роль на платформе
 * говорит «работает в индустрии», а не «владеет заведением».
 */
@Injectable()
export class TeamAccountRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Заводит аккаунт и вводит человека в организацию одной транзакцией.
   *
   * Половина результата хуже, чем ничего: пользователь без членства попадёт в
   * кабинет, которого у него нет, а членство без пользователя — строка,
   * ссылающаяся в пустоту.
   *
   * Почта отмечается подтверждённой: сюда приходят только по ссылке из письма,
   * то есть человек только что доказал, что ящик его.
   */
  createEmployee(
    input: EmployeeAccountInput,
    membership: { organizationId: string; role: OrgRole; displayName: string | null },
  ): Promise<{ user: UserRow; memberId: string }> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          phone: input.phone,
          locale: input.locale,
          fullName: input.fullName.trim(),
          passwordHash: input.passwordHash,
          systemRole: 'master',
          emailVerifiedAt: now,
          /* Согласие на обработку даётся здесь: другого момента у этого
             человека не будет — он не подавал заявку, его позвали. */
          gdprConsentAt: now,
        })
        .returning();

      const [member] = await tx
        .insert(organizationMembers)
        .values({ ...membership, userId: user!.id, status: 'active' })
        .returning({ id: organizationMembers.id });

      return { user: user!, memberId: member!.id };
    });
  }

  /**
   * Клиент принимает приглашение: аккаунт остаётся тот же, к нему добавляется
   * членство.
   *
   * Не заведение второго аккаунта — почта уникальна, и, что важнее, у
   * человека уже есть история записей как клиента. Мастер, начинающая с
   * чистого листа рядом со своей же историей, — это два человека вместо
   * одного.
   *
   * Поколение токенов поднимается: выданные сессии знают его клиентом, и роль
   * в них клиентская.
   */
  promoteClient(
    userId: string,
    membership: { organizationId: string; role: OrgRole; displayName: string | null },
  ): Promise<{ user: UserRow; memberId: string }> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [user] = await tx
        .update(users)
        .set({
          systemRole: 'master',
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, ${now})`,
          gdprConsentAt: sql`coalesce(${users.gdprConsentAt}, ${now})`,
          tokenVersion: sql`${users.tokenVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();

      const [member] = await tx
        .insert(organizationMembers)
        .values({ ...membership, userId, status: 'active' })
        .returning({ id: organizationMembers.id });

      return { user: user!, memberId: member!.id };
    });
  }

  /** Мастер приходит вторым местом работы: аккаунт не трогаем, только членство. */
  async addMembership(
    userId: string,
    membership: { organizationId: string; role: OrgRole; displayName: string | null },
  ): Promise<string> {
    const [member] = await this.db
      .insert(organizationMembers)
      .values({ ...membership, userId, status: 'active' })
      .returning({ id: organizationMembers.id });
    return member!.id;
  }

  findLiveByEmail(email: string): Promise<UserRow | null> {
    return this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.trim().toLowerCase()), isNull(users.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findLiveByPhone(phone: string): Promise<UserRow | null> {
    return this.db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findLiveById(userId: string): Promise<UserRow | null> {
    return this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }
}
