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

  async findByOrganizationMember(organizationMemberId: string): Promise<PushRecipient | null> {
    const [recipient] = await this.db
      .select({
        userId: users.id,
        locale: users.locale,
        organizationSlug: organizations.slug,
        timeZone: organizations.timezone,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.id, organizationMemberId));

    return recipient ?? null;
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
