import type { BookingRow } from '../../../shared/database/schema/bookings';

export type BookingStatus = BookingRow['status'];

/**
 * Таблица переходов живёт в общем ядре (`@amolie/shared-kernel`,
 * `booking-status.ts`) вместе со своим обоснованием: кабинет спрашивает её же,
 * чтобы не предлагать возврат, который здесь будет отклонён. Отсюда она
 * реэкспортируется, чтобы домен API продолжал читать её по месту.
 */
export { STATUSES_LEADING_TO } from '@amolie/shared-kernel';

/**
 * Statuses after which the windows the visit held go back on sale.
 *
 * Mirrors the predicate of the `bookings_active_published_slot_id_unique`
 * partial index (see schema/bookings.ts): the database already stops counting
 * *both* cancellations against the window, so anything that stays `booked` in
 * `published_slots` after one of them is the two sides disagreeing about the
 * same fact — the time is free by the index and lost by the calendar.
 *
 * `no_show` is deliberately absent. The client did not come, but the master
 * held the chair and may still mark the visit completed (see
 * STATUSES_LEADING_TO); the hour is spent either way, and putting it back on
 * sale would offer a moment that has already passed.
 */
export const STATUSES_RELEASING_SLOTS: readonly BookingStatus[] = [
  'cancelled_by_client',
  'cancelled_by_master',
];

export function releasesSlots(status: BookingStatus): boolean {
  return STATUSES_RELEASING_SLOTS.includes(status);
}

/** The move was refused: the booking exists, but not in a status this leaves from. */
export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
  ) {
    super(`Запись в статусе «${from}» нельзя перевести в «${to}»`);
  }
}
