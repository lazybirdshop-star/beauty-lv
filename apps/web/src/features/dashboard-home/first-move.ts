import type { Booking } from '@/features/bookings/types';

/** Что кабинет советует сделать первым. */
export type FirstMoveKind =
  /** Клиенты ждут решения — это долг перед людьми, и он старше всего прочего. */
  | 'answer'
  /** Визиты кончились, а отметить их забыли — без отметки нет дохода. */
  | 'complete'
  /** Ближайшее свободное окно скоро, и его ещё можно продать. */
  | 'offer'
  /** Впереди нет открытого времени — записаться нельзя ни на что. */
  | 'openTime';

export interface FirstMove {
  kind: FirstMoveKind;
  /** Сколько предметов за советом: заявок, визитов, минут до окна. */
  count: number;
}

export interface FirstMoveInput {
  /** Визиты сегодня в активных статусах. */
  today: readonly Booking[];
  /** Непринятые заявки — любых дат. */
  pending: readonly Booking[];
  /** Минут до ближайшего продаваемого окна; `null` — окон нет. */
  nextWindowInMinutes: number | null;
  /** Есть ли открытое время на неделю вперёд. */
  openAhead: boolean;
  now: number;
}

/** Окно ближе этого стоит предлагать: дальше оно ещё не срочно. */
const SOON_MINUTES = 90;

const durationOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) * 60_000;

/**
 * Одно дело на утро.
 *
 * Главная перечисляла день семью карточками равного веса и ни одной не
 * говорила, с чего начать (критика 2026-09-28, третий круг подряд). Совет
 * берётся из тех же данных, что уже на экране, и следует одному порядку
 * старшинства:
 *
 * 1. Клиент ждёт ответа. Это долг перед человеком, и он старше всего:
 *    пока заявка висит, время у мастера занято, а у клиента нет.
 * 2. Визит кончился, а отметки нет. Без неё день не попадёт в доход.
 * 3. Скоро свободное окно. Его ещё можно продать — потом уже нет.
 * 4. Впереди нет открытого времени. Записаться нельзя ни на что, и это
 *    тише предыдущего только потому, что случается реже.
 *
 * Идущий приём в совет не попадает: «сейчас в кресле Анна» — это не дело,
 * которое делают, а состояние дня, и оно уже стоит на экране своей строкой.
 *
 * `null` — когда советовать нечего: день идёт как надо, и выдумывать себе
 * занятие кабинет не станет.
 */
export function firstMove({
  today,
  pending,
  nextWindowInMinutes,
  openAhead,
  now,
}: FirstMoveInput): FirstMove | null {
  if (pending.length > 0) return { kind: 'answer', count: pending.length };

  const unmarked = today.filter(
    (booking) =>
      booking.status === 'confirmed' &&
      new Date(booking.startsAt).getTime() + durationOf(booking) <= now,
  );
  if (unmarked.length > 0) return { kind: 'complete', count: unmarked.length };

  if (nextWindowInMinutes !== null && nextWindowInMinutes <= SOON_MINUTES)
    return { kind: 'offer', count: nextWindowInMinutes };

  if (!openAhead) return { kind: 'openTime', count: 0 };

  return null;
}
