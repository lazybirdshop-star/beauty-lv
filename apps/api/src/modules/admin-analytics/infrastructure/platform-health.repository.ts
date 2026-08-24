import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, isNull, sql } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { pushSubscriptions } from '../../../shared/database/schema/push-subscriptions';
import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { users } from '../../../shared/database/schema/users';

export interface PlatformHealthFacts {
  databaseOk: boolean;
  /** Администраторов платформы всего и скольких из них найдёт уведомление. */
  admins: number;
  adminsReachable: number;
  pushSubscriptions: number;
  pendingRequests: number;
  bookingsLast24h: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Факты о состоянии платформы, которые видит только база.
 *
 * Настроенность почты и push сюда не входит: это конфигурация процесса, и
 * знают о ней клиенты соответствующих сервисов, а не таблицы.
 */
@Injectable()
export class PlatformHealthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async collect(): Promise<PlatformHealthFacts> {
    const since = new Date(Date.now() - DAY_MS);

    const [[admins], [reachable], [subscriptions], [pending], [recentBookings]] = await Promise.all(
      [
        this.db
          .select({ value: count() })
          .from(users)
          .where(
            and(
              eq(users.systemRole, 'platform_admin'),
              eq(users.accountStatus, 'active'),
              isNull(users.deletedAt),
            ),
          ),
        /* Не «сколько подписок», а «скольких администраторов уведомление
           найдёт»: три подписки одного человека и ноль у остальных двух —
           это не покрытие, а видимость покрытия. */
        this.db
          .select({ value: sql<number>`count(distinct ${pushSubscriptions.userId})::int` })
          .from(pushSubscriptions)
          .innerJoin(users, eq(users.id, pushSubscriptions.userId))
          .where(
            and(
              eq(users.systemRole, 'platform_admin'),
              eq(users.accountStatus, 'active'),
              isNull(users.deletedAt),
            ),
          ),
        this.db.select({ value: count() }).from(pushSubscriptions),
        this.db
          .select({ value: count() })
          .from(registrationRequests)
          .where(eq(registrationRequests.status, 'pending')),
        this.db
          .select({ value: count() })
          .from(bookings)
          .where(and(gte(bookings.createdAt, since), isNull(bookings.deletedAt))),
      ],
    );

    return {
      /* Запрос выполнился — значит база отвечает. Отдельного ping не нужно:
         эти пять уже прошли через то же соединение. */
      databaseOk: true,
      admins: admins?.value ?? 0,
      adminsReachable: reachable?.value ?? 0,
      pushSubscriptions: subscriptions?.value ?? 0,
      pendingRequests: pending?.value ?? 0,
      bookingsLast24h: recentBookings?.value ?? 0,
    };
  }
}
