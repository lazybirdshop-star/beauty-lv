import type { BookingStatus } from './types';

/**
 * The bookings list shows one of four postures. It is a value rather than a
 * component detail because three places now agree on it: the screen holds it,
 * the route reads it from the address, and the home page's activity feed links
 * into it.
 */
export type BookingFilter = 'all' | Extract<BookingStatus, 'pending' | 'confirmed' | 'completed'>;

const FILTERS: BookingFilter[] = ['all', 'pending', 'confirmed', 'completed'];

/** Anything else in the query string means «show me everything», not an error page. */
export function parseBookingFilter(value: string | undefined): BookingFilter {
  return FILTERS.includes(value as BookingFilter) ? (value as BookingFilter) : 'all';
}

/**
 * Which posture opens a given entry. Statuses the filter row does not offer
 * (cancelled, no-show) land on «Все», where the booking is still visible in
 * the archive group — better than a filter that shows an empty list.
 */
export function filterForStatus(status: BookingStatus): BookingFilter {
  return parseBookingFilter(status);
}
