import type { BookingStatus } from './booking-status';

const HOUR_MS = 3_600_000;

/**
 * Статусы, из которых отмена ещё возможна.
 *
 * Тот же список, что у `STATUSES_LEADING_TO.cancelled_by_client`, но заданный
 * здесь отдельно и намеренно: там он отвечает на вопрос базы «какой `WHERE`
 * поставить», здесь — на вопрос экрана «показывать ли кнопку». Совпадение
 * двух ответов проверено тестом, а не выражено общей константой: сведи их в
 * одну, и правило «мастер может отменить состоявшийся визит, а клиент нет»
 * стало бы невыразимым.
 */
const CANCELLABLE_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

/**
 * Момент, до которого клиент ещё может отменить визит сам.
 *
 * `null` означает «не может»: либо мастер не включала самостоятельную отмену
 * (`hours === null`), либо визит уже в статусе, из которого отменять нечего.
 * Одно значение вместо трёх флагов — потому что интерфейсу нужен ровно один
 * ответ: до какого времени показывать кнопку.
 */
export function clientCancellationDeadline(input: {
  startsAt: Date;
  status: BookingStatus;
  hours: number | null;
}): Date | null {
  if (input.hours === null) return null;
  if (!CANCELLABLE_STATUSES.includes(input.status)) return null;

  return new Date(input.startsAt.getTime() - input.hours * HOUR_MS);
}

/** Отказ в отмене — с причиной, которую экран обязан произнести по-разному. */
export type CancellationRefusal = 'disabled' | 'too_late' | 'not_possible';

/**
 * Можно ли отменить прямо сейчас. `null` — можно; иначе причина отказа.
 *
 * Проверяется и на сервере, и при отрисовке кнопки: экран решает, показывать
 * ли её, сервер — единственный, кто решает по-настоящему. Часы клиента
 * отстают, врут и переводятся вручную, поэтому «поздно» считает тот, у кого
 * время одно на всех.
 */
export function refuseClientCancellation(
  input: { startsAt: Date; status: BookingStatus; hours: number | null },
  now: Date,
): CancellationRefusal | null {
  if (input.hours === null) return 'disabled';
  if (!CANCELLABLE_STATUSES.includes(input.status)) return 'not_possible';

  const deadline = new Date(input.startsAt.getTime() - input.hours * HOUR_MS);
  return now.getTime() > deadline.getTime() ? 'too_late' : null;
}
