/**
 * Почему отмена не прошла, — значением, о котором договорились обе стороны.
 *
 * Как и `AUTH_ERROR_CODES`, коды нужны потому, что объяснять отказ приходится
 * человеку, у которого продукт ещё не знает языка: страница записи гостя
 * говорит на языке мастера, а не сервера. По HTTP-статусу «нельзя» от «поздно»
 * не отличить, а сказать это надо разными словами — во втором случае человеку
 * остаётся позвонить, в первом звонить и было единственным способом.
 */
export const BOOKING_ERROR_CODES = {
  /** Мастер не включала самостоятельную отмену. */
  cancellationDisabled: 'cancellation_disabled',
  /** Срок вышел: до визита осталось меньше, чем она разрешила. */
  cancellationTooLate: 'cancellation_too_late',
  /** Визит уже отменён, состоялся или отмечен неявкой — отменять нечего. */
  cancellationNotPossible: 'cancellation_not_possible',
} as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];

export function isBookingErrorCode(value: unknown): value is BookingErrorCode {
  return (
    typeof value === 'string' && (Object.values(BOOKING_ERROR_CODES) as string[]).includes(value)
  );
}
