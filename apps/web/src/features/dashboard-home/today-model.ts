import type { Booking } from '@/features/bookings/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { getDayBookings } from './today-bookings';

export function todayModel(
  bookings: Booking[],
  slots: PublishedSlot[],
  now: Date,
  timeZone: string,
) {
  const today = getDayBookings(bookings, now, timeZone);
  const duration = (booking: Booking) =>
    booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const next = today.find(
    (booking) =>
      booking.status === 'confirmed' &&
      new Date(booking.startsAt).getTime() + duration(booking) * 60_000 > now.getTime(),
  );
  const revenue = new Map<string, number>();
  for (const booking of today) {
    for (const item of booking.items)
      revenue.set(
        item.priceCurrencySnapshot,
        (revenue.get(item.priceCurrencySnapshot) ?? 0) + item.priceAmountSnapshot,
      );
  }
  const open = slots
    .filter(
      (slot) => slot.status === 'available' && !slot.hiddenAt && new Date(slot.startsAt) > now,
    )
    .filter(
      (slot) =>
        !today.some((booking) => {
          if (booking.organizationMemberId !== slot.organizationMemberId) return false;
          const start = new Date(booking.startsAt).getTime();
          const at = new Date(slot.startsAt).getTime();
          return at >= start && at < start + duration(booking) * 60_000;
        }),
    );
  return {
    today,
    next,
    revenue: [...revenue],
    open,
    pending: today.filter((booking) => booking.status === 'pending'),
  };
}
