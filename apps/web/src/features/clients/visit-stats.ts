import { normalizePhone } from '@beauty-lv/shared-kernel';

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
 */
export function getClientVisitStats(client: Client, bookings: Booking[]): ClientVisitStats {
  const clientPhone = normalizePhone(client.phone);
  const matches = bookings.filter(
    (booking) => booking.guestPhone && normalizePhone(booking.guestPhone) === clientPhone,
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
