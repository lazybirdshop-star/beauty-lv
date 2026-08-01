import type { Booking } from '../bookings/types';
import type { Client } from './types';

export interface ClientVisitStats {
  visitCount: number;
  lastVisitAt: string | null;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}

/**
 * Bookings link to clients by phone number, not a foreign key (see
 * clients.ts schema comment) — this is the join, done client-side since
 * both lists are already fetched on this screen.
 */
export function getClientVisitStats(client: Client, bookings: Booking[]): ClientVisitStats {
  const matches = bookings.filter(
    (booking) =>
      booking.guestPhone && normalizePhone(booking.guestPhone) === normalizePhone(client.phone),
  );
  const completed = matches.filter((booking) => booking.status === 'completed');
  const lastVisitAt = completed.reduce<string | null>((latest, booking) => {
    if (!latest || booking.startsAt > latest) return booking.startsAt;
    return latest;
  }, null);

  return { visitCount: completed.length, lastVisitAt };
}
