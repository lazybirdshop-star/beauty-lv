import type { Booking } from '../bookings/types';

const ACTIVE_TODAY_STATUSES: Booking['status'][] = ['pending', 'confirmed', 'completed'];

/** Today's bookings a master actually cares about seeing, earliest first — cancelled/no-show excluded. */
export function getTodaysBookings(bookings: Booking[]): Booking[] {
  const now = new Date();
  return bookings
    .filter((booking) => {
      if (!ACTIVE_TODAY_STATUSES.includes(booking.status)) return false;
      const startsAt = new Date(booking.startsAt);
      return (
        startsAt.getFullYear() === now.getFullYear() &&
        startsAt.getMonth() === now.getMonth() &&
        startsAt.getDate() === now.getDate()
      );
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
