import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull, and } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { users } from '../../../shared/database/schema/users';
import type { BookingStatus } from '../../booking/domain/booking-status';

export interface BookingLetterContext {
  bookingId: string;
  status: BookingStatus;
  startsAt: Date;
  publicToken: string;
  slug: string;
  /** Имя, которое человек видел на странице записи. */
  master: string;
  timezone: string;
  /** Язык страницы записи — тот, на котором человек и записывался. */
  organizationLocale: string;
  /** Язык кабинета клиента, если аккаунт есть: он сильнее языка страницы. */
  clientLocale: string | null;
  /** Куда слать. `null` — человек не оставил адреса, и письма не будет. */
  email: string | null;
  serviceNames: string[];
}

/**
 * Всё, что нужно письму о визите, — одним чтением.
 *
 * Живёт в уведомлениях, а не в записях, по тому же правилу, что и
 * `PushRecipientsRepository`: модуль записей не должен знать ни про адреса, ни
 * про языки, ни про то, как называется мастер на своей странице.
 */
@Injectable()
export class BookingLetterRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findContext(bookingId: string): Promise<BookingLetterContext | null> {
    const [row] = await this.db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        startsAt: publishedSlots.startsAt,
        publicToken: bookings.publicToken,
        slug: organizations.slug,
        name: organizations.name,
        publicDisplayName: organizations.publicDisplayName,
        timezone: organizations.timezone,
        organizationLocale: organizations.defaultLocale,
        guestEmail: bookings.guestEmail,
        /* Почта аккаунта — запасной адрес, а не первый: человек мог записаться
           гостем, назвав другой. В карточку клиента у мастера она по-прежнему
           не попадает (см. `GuestBookingService`), здесь она только конверт. */
        accountEmail: users.email,
        clientLocale: users.locale,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(organizations, eq(bookings.organizationId, organizations.id))
      .leftJoin(users, eq(bookings.clientUserId, users.id))
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .limit(1);

    if (!row) return null;

    const items = await this.db
      .select({ name: bookingItems.serviceNameSnapshot })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, row.bookingId));

    return {
      bookingId: row.bookingId,
      status: row.status,
      startsAt: row.startsAt,
      publicToken: row.publicToken,
      slug: row.slug,
      master: row.publicDisplayName ?? row.name,
      timezone: row.timezone,
      organizationLocale: row.organizationLocale,
      clientLocale: row.clientLocale,
      email: row.guestEmail ?? row.accountEmail,
      serviceNames: items.map((item) => item.name),
    };
  }
}
