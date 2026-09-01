import type { BookingRow } from '../../../shared/database/schema/bookings';

export type BookingStatus = BookingRow['status'];

/**
 * Which statuses a booking may move *from* to reach a given status.
 *
 * A booking's status was previously any value overwriting any other, and two
 * of those moves are not merely untidy:
 *
 * - `cancelled_* → completed` puts a cancelled visit back into revenue
 *   (`FinanceRepository` sums exactly `completed`), while the windows it held
 *   have already been released and may belong to somebody else's appointment.
 * - `cancelled_* → confirmed` collides with the partial unique index that
 *   keeps one active booking per window, so it failed as an unhandled 500
 *   rather than as an answer.
 *
 * Hence: cancellation and completion are final. What a master can still fix is
 * a `no_show` — that one is a judgement made in the moment, the windows are
 * still held, and being wrong about it must not be permanent.
 *
 * Expressed as "who may become this" rather than "what may this become"
 * because that is the direction the update needs it: the target is known, and
 * the set of acceptable current values goes straight into the `WHERE`.
 */
export const STATUSES_LEADING_TO: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: [],
  confirmed: ['pending'],
  completed: ['pending', 'confirmed', 'no_show', 'expired'],
  no_show: ['pending', 'confirmed', 'expired'],
  cancelled_by_master: ['pending', 'confirmed', 'no_show'],
  cancelled_by_client: ['pending', 'confirmed'],
  /**
   * Час визита прошёл, а ответа мастера так и не было.
   *
   * Ставится только фоновым проходом и только из `pending`: подтверждённой
   * записи истекать нечем, а отменённую трогать поздно. Тупиком статус не
   * является — из него ведут `completed` и `no_show` (см. выше): человек мог
   * прийти и без подтверждения, и мастер вправе это записать.
   */
  expired: ['pending'],
};

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
