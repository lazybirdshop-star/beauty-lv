import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';

export interface PushRecipient {
  userId: string;
  /** `users.locale` — язык кабинета мастера, а не язык страницы, с которой записались. */
  locale: string;
  organizationSlug: string;
  /** Пояс организации: «сегодня в 14:00» обязано быть часами салона. */
  timeZone: string;
}

export interface BookingEventRecipient extends PushRecipient {
  /** Сам мастер визита: ему не нужно сообщать, к кому запись. */
  isVisitMaster: boolean;
}

/**
 * Кому адресовано уведомление о событии календаря.
 *
 * Живёт здесь, а не в модуле записей: «кто получит» — вопрос уведомлений, и
 * ровно он позволяет модулю записей не знать про push ничего, кроме одного
 * вызова с данными, которые у него и так на руках. Обратной зависимости нет —
 * эта таблица читает участников, пользователей и организации, но никогда
 * записи.
 */
@Injectable()
export class PushRecipientsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Кто узнаёт о событии записи — SALON.md SL-13.
   *
   * Мастер визита и администрация салона: владелицы и администраторы. В
   * салоне запись к Юле — это и её день, и работа стойки, которая ведёт
   * расписание всех; узнать о ней через час, открыв кабинет, — поздно.
   *
   * Каждый человек — один раз: у соло-мастера мастер визита и владелица —
   * одно лицо, и два одинаковых уведомления на экране блокировки были бы
   * ошибкой. Отстранённые участники и заблокированные аккаунты не получают
   * ничего — доступа к кабинету у них нет.
   */
  async findForBookingEvent(
    organizationMemberId: string,
  ): Promise<{ masterName: string; recipients: BookingEventRecipient[] } | null> {
    const [visitMember] = await this.db
      .select({
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        status: organizationMembers.status,
        deletedAt: organizationMembers.deletedAt,
        displayName: organizationMembers.displayName,
        fullName: users.fullName,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.id, organizationMemberId));
    if (!visitMember) return null;

    const rows = await this.db
      .select({
        memberId: organizationMembers.id,
        userId: users.id,
        locale: users.locale,
        role: organizationMembers.role,
        organizationSlug: organizations.slug,
        timeZone: organizations.timezone,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(
        and(
          eq(organizationMembers.organizationId, visitMember.organizationId),
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
          eq(users.accountStatus, 'active'),
          isNull(users.deletedAt),
        ),
      );

    const recipients = new Map<string, BookingEventRecipient>();
    for (const row of rows) {
      const isVisitMaster = row.memberId === organizationMemberId;
      if (!isVisitMaster && row.role === 'master') continue;
      const existing = recipients.get(row.userId);
      recipients.set(row.userId, {
        userId: row.userId,
        locale: row.locale,
        organizationSlug: row.organizationSlug,
        timeZone: row.timeZone,
        isVisitMaster: isVisitMaster || Boolean(existing?.isVisitMaster),
      });
    }

    return {
      masterName: visitMember.displayName?.trim() || visitMember.fullName,
      recipients: [...recipients.values()],
    };
  }

  /**
   * Все администраторы платформы — получатели уведомлений о заявках.
   *
   * Всем сразу, а не «дежурному»: дежурства в продукте нет, а заявка, о
   * которой узнал один администратор в отпуске, стоит в очереди неделю.
   * Заблокированные аккаунты пропускаются — у них и кабинета нет.
   */
  findPlatformAdmins(): Promise<{ userId: string; locale: string }[]> {
    return this.db
      .select({ userId: users.id, locale: users.locale })
      .from(users)
      .where(
        and(
          eq(users.systemRole, 'platform_admin'),
          eq(users.accountStatus, 'active'),
          isNull(users.deletedAt),
        ),
      );
  }
}
