/**
 * Жизненный цикл записи — одна таблица на базу, API и кабинет.
 *
 * До этого таблица переходов жила только в API, а кабинет решал сам, куда
 * можно вернуть визит. Решал неверно: «Вернуть» после «Завершить» и «Не
 * пришёл» предлагалось и визиту, который так и не подтверждали, — сервер
 * такой возврат отклонял, и кнопка отвечала ошибкой. Теперь обе стороны
 * спрашивают одно и то же место (как роли — `rbac.ts`).
 */

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
  /** Час визита прошёл, а мастер так и не ответила — гасит фоновый проход. */
  'expired',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

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
 * Hence: cancellation is final. What a master can still fix is a judgement
 * made in the moment with the client in the chair — `no_show` and
 * `completed` both lead back to `confirmed`. Neither of them released the
 * windows the visit holds (see STATUSES_RELEASING_SLOTS in the API), so the
 * booking never left the partial unique index and the move back changes no
 * column that index keys on; and `FinanceRepository` sums exactly
 * `completed`, so the reverted visit drops out of income by the same rule
 * that put it there. The client hears nothing of either return — the
 * confirmation letter belongs to answering a request (see
 * BookingController.updateStatus).
 *
 * Only back to `confirmed`, never to `pending` or `expired`: nothing leads
 * into `pending`, and `expired` is the background sweep's word alone. A visit
 * marked from either of those has no return path — see `canMoveTo`.
 *
 * Expressed as "who may become this" rather than "what may this become"
 * because that is the direction the update needs it: the target is known, and
 * the set of acceptable current values goes straight into the `WHERE`.
 */
export const STATUSES_LEADING_TO: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: [],
  confirmed: ['pending', 'no_show', 'completed'],
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

/** Примет ли сервер переход `from → to`. Кабинет предлагает только такие. */
export function canMoveTo(from: BookingStatus, to: BookingStatus): boolean {
  return STATUSES_LEADING_TO[to].includes(from);
}
