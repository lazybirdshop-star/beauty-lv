import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gt, isNull, notInArray, sql } from 'drizzle-orm';

import { bookings, type BookingRow } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { users } from '../../../shared/database/schema/users';

/** Отменённый визит никого не ждёт — он удалению не мешает. */
const CANCELLED: BookingRow['status'][] = ['cancelled_by_client', 'cancelled_by_master'];

export interface DeletionBlockers {
  /** Сколько людей придут в этот салон и останутся ни с чем. */
  upcomingBookings: number;
}

export type DeletionResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'is-admin' }
  | { ok: false; reason: 'has-upcoming'; blockers: DeletionBlockers };

/**
 * Удаление аккаунта мастера — то, чего у продукта не было вовсе.
 *
 * Право на удаление своих данных не зависит от нашей готовности его
 * обслуживать, поэтому кнопка обязана существовать. Но «удалить мастера» —
 * это не одна строка в `users`: за ней стоит салон, публичная страница и
 * чужие люди, записанные на четверг.
 *
 * Отсюда три правила:
 *
 * 1. **Предстоящие визиты запрещают удаление.** Мы не стираем бизнес, в
 *    который записаны люди: клиент, пришедший к закрытой двери, — не цена
 *    за уборку данных. Сначала визиты отменяются (клиенты получают
 *    уведомление), потом удаляется аккаунт.
 * 2. **Личные данные обезличиваются, а не остаются лежать.** Имя, почта,
 *    телефон и аватар — это то, ради чего удаление и просят. Освободившиеся
 *    почта и телефон снова доступны для регистрации.
 * 3. **История салона не стирается.** Записи и клиентская книга принадлежат
 *    делу, а не аккаунту; они уходят вместе с организацией в мягкое
 *    удаление и перестают быть видимыми, но не превращаются в пустоту, по
 *    которой потом не собрать ни одного отчёта.
 */
@Injectable()
export class AccountDeletionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Сколько предстоящих визитов держат аккаунт. Ноль — удалять можно. */
  async upcomingBookingsFor(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(bookings)
      .innerJoin(publishedSlots, eq(publishedSlots.id, bookings.publishedSlotId))
      .innerJoin(
        organizationMembers,
        eq(organizationMembers.organizationId, bookings.organizationId),
      )
      .where(
        and(
          eq(organizationMembers.userId, userId),
          isNull(organizationMembers.deletedAt),
          isNull(bookings.deletedAt),
          notInArray(bookings.status, CANCELLED),
          gt(publishedSlots.startsAt, new Date()),
        ),
      );

    return row?.value ?? 0;
  }

  async deleteMaster(userId: string): Promise<DeletionResult> {
    const [user] = await this.db
      .select({ id: users.id, systemRole: users.systemRole })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    if (!user) return { ok: false, reason: 'not-found' };
    if (user.systemRole === 'platform_admin') return { ok: false, reason: 'is-admin' };

    const upcoming = await this.upcomingBookingsFor(userId);
    if (upcoming > 0) {
      return { ok: false, reason: 'has-upcoming', blockers: { upcomingBookings: upcoming } };
    }

    await this.db.transaction(async (tx) => {
      const now = new Date();

      /* Обезличивание и удаление одной операцией: аккаунт, у которого сняли
         имя, но оставили живым, — это худшее из двух состояний. */
      await tx
        .update(users)
        .set({
          fullName: 'Удалённый аккаунт',
          email: null,
          phone: null,
          avatarUrl: null,
          passwordHash: null,
          deletedAt: now,
          updatedAt: now,
          /* Поднятое поколение завершает все открытые сессии немедленно —
             удалённый аккаунт не должен доработать день на старом токене. */
          tokenVersion: sql`${users.tokenVersion} + 1`,
        })
        .where(eq(users.id, userId));

      /* Салоны, которыми мастер владела, закрываются: публичная страница
         перестаёт отвечать, адрес освобождается не сразу, а остаётся за
         историей — тем же мягким удалением, что и везде. */
      await tx
        .update(organizations)
        .set({ status: 'archived', deletedAt: now, updatedAt: now })
        .where(and(eq(organizations.ownerUserId, userId), isNull(organizations.deletedAt)));

      /* Членства в чужих салонах просто прекращаются: салон продолжает
         работать без неё. */
      await tx
        .update(organizationMembers)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(organizationMembers.userId, userId), isNull(organizationMembers.deletedAt)));
    });

    return { ok: true };
  }

  /**
   * Что платформа хранит об этом человеке — одним объектом.
   *
   * Ответ на «покажите мои данные», который иначе собирают запросами к базе
   * руками. Клиентская книга и записи сюда не входят: это данные салона, и
   * выгружает их сама мастер из кабинета.
   */
  async exportAccount(userId: string): Promise<Record<string, unknown> | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        locale: users.locale,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
        emailVerifiedAt: users.emailVerifiedAt,
        phoneVerifiedAt: users.phoneVerifiedAt,
        gdprConsentAt: users.gdprConsentAt,
        smsRemindersEnabled: users.smsRemindersEnabled,
        emailRemindersEnabled: users.emailRemindersEnabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    if (!user) return null;

    const memberships = await this.db
      .select({
        organizationId: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        joinedAt: organizationMembers.createdAt,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        city: organizations.city,
        addressLine: organizations.addressLine,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), isNull(organizationMembers.deletedAt)));

    return { account: user, organizations: memberships, exportedAt: new Date().toISOString() };
  }
}
