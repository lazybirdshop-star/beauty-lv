import { phoneMatchKey } from '@amolie/shared-kernel';

import type { Booking } from '../bookings/types';
import type { Client } from './types';

export interface ClientVisitStats {
  /** Non-cancelled bookings only — a cancelled one never happened, so it shouldn't count as "times booked". */
  totalBookings: number;
  favoriteServiceName: string | null;
  /** Most recent *completed* booking — an upcoming/pending one isn't a past visit yet. */
  lastVisitAt: string | null;
}

const CANCELLED_STATUSES = new Set(['cancelled_by_client', 'cancelled_by_master']);

/**
 * Bookings link to clients by phone number, not a foreign key (see
 * clients.ts schema comment) — this is the join, done client-side since
 * both lists are already fetched on this screen.
 *
 * Соединение идёт по `phoneMatchKey` — форме **сравнения**, той же, которой
 * API решает «тот же ли это человек» при создании записи и при проверке
 * блокировки. Раньше здесь стояла форма **хранения** (`normalizePhone`), и
 * «+371 20 000 111» с «20 000 111» были для карточки разными людьми: мастер
 * читала «первый раз у нас» про клиентку, которая ходит к ней полгода, —
 * ровно тот разрыв, который был зафиксирован тестом ниже как известный.
 */
export function getClientVisitStats(client: Client, bookings: Booking[]): ClientVisitStats {
  const clientPhone = phoneMatchKey(client.phone);
  const matches = bookings.filter(
    (booking) => booking.guestPhone && phoneMatchKey(booking.guestPhone) === clientPhone,
  );
  const notCancelled = matches.filter((booking) => !CANCELLED_STATUSES.has(booking.status));

  const serviceCounts = new Map<string, number>();
  for (const booking of notCancelled) {
    for (const item of booking.items) {
      serviceCounts.set(
        item.serviceNameSnapshot,
        (serviceCounts.get(item.serviceNameSnapshot) ?? 0) + 1,
      );
    }
  }
  let favoriteServiceName: string | null = null;
  let favoriteCount = 0;
  for (const [name, serviceCount] of serviceCounts) {
    if (serviceCount > favoriteCount) {
      favoriteServiceName = name;
      favoriteCount = serviceCount;
    }
  }

  const completed = matches.filter((booking) => booking.status === 'completed');
  const lastVisitAt = completed.reduce<string | null>((latest, booking) => {
    if (!latest || booking.startsAt > latest) return booking.startsAt;
    return latest;
  }, null);

  return { totalBookings: notCancelled.length, favoriteServiceName, lastVisitAt };
}

/**
 * The client's own bookings, newest first — including cancelled ones, since
 * "she cancelled twice last month" is exactly the kind of thing the master
 * opens this card to find out. Same phone-based join as the stats above.
 */
export function getClientBookings(client: Client, bookings: Booking[]): Booking[] {
  const clientPhone = phoneMatchKey(client.phone);
  return bookings
    .filter((booking) => booking.guestPhone && phoneMatchKey(booking.guestPhone) === clientPhone)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}
