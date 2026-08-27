import type { BookingStatus } from './types';

/**
 * The bookings list shows one of five postures. It is a value rather than a
 * component detail because three places now agree on it: the screen holds it,
 * the route reads it from the address, and the home page's activity feed links
 * into it.
 *
 * `cancelled` — не статус, а их пара: мастер, просматривающая отменённое, не
 * разбирает, кто именно отменил, — она смотрит на освободившееся время. Двух
 * вкладок вместо одной здесь быть не должно.
 */
export type BookingFilter =
  'all' | Extract<BookingStatus, 'pending' | 'confirmed' | 'completed'> | 'cancelled';

const FILTERS: BookingFilter[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

/** Обе отмены — одно и то же для того, кто смотрит список. */
const CANCELLED: BookingStatus[] = ['cancelled_by_client', 'cancelled_by_master'];

export function isCancelled(status: BookingStatus): boolean {
  return CANCELLED.includes(status);
}

/** Попадает ли запись в выбранную позицию списка. */
export function matchesFilter(status: BookingStatus, filter: BookingFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'cancelled') return isCancelled(status);
  return status === filter;
}

/** Anything else in the query string means «show me everything», not an error page. */
export function parseBookingFilter(value: string | undefined): BookingFilter {
  return FILTERS.includes(value as BookingFilter) ? (value as BookingFilter) : 'all';
}

/**
 * Which posture opens a given entry. `no_show` вкладки не имеет и ведёт на
 * «Все», где запись видна в архиве, — это лучше пустого списка. Отменённые
 * ведут на свою вкладку: она наконец существует.
 */
export function filterForStatus(status: BookingStatus): BookingFilter {
  if (isCancelled(status)) return 'cancelled';
  return parseBookingFilter(status);
}
