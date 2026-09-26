import type { Booking } from '../bookings/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface VisitRhythm {
  /** Обычный промежуток между визитами, в днях. */
  averageDays: number;
  /** Сколько дней прошло с последнего завершённого визита. */
  sinceLastDays: number;
  /** Человек не пришёл дольше обычного и не записан наперёд. */
  overdue: boolean;
}

/**
 * Ритм возвратов клиента.
 *
 * Карточка знала, сколько визитов было и сколько денег принесено, но не
 * отвечала на вопрос, ради которого её открывают: пора ли писать. Ответ
 * лежит в тех же данных — в промежутках между визитами.
 *
 * Считается по завершённым визитам: отменённые и неявки ритма не задают.
 * Нужно не меньше трёх, иначе «обычно» — это одно число, выданное за
 * закономерность. Промежуток — медиана, а не среднее: один визит спустя
 * полгода перекашивает среднее и делает вывод бессмысленным.
 *
 * `overdue` не ставится, когда человек уже записан наперёд: он не «пропал»,
 * он придёт.
 */
export function visitRhythm(
  history: readonly Booking[],
  now: number,
  hasUpcoming: boolean,
): VisitRhythm | null {
  const days = history
    .filter((booking) => booking.status === 'completed')
    .map((booking) => new Date(booking.startsAt).getTime())
    .sort((a, b) => a - b);
  if (days.length < 3) return null;

  const gaps: number[] = [];
  for (let index = 1; index < days.length; index += 1) {
    gaps.push((days[index]! - days[index - 1]!) / DAY_MS);
  }
  gaps.sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  const averageDays = Math.round(
    gaps.length % 2 ? gaps[middle]! : (gaps[middle - 1]! + gaps[middle]!) / 2,
  );
  if (averageDays <= 0) return null;

  const sinceLastDays = Math.floor((now - days[days.length - 1]!) / DAY_MS);
  /* Запас в четверть промежутка: клиент, опоздавший на день, ещё не пропал. */
  const overdue = !hasUpcoming && sinceLastDays > averageDays * 1.25;

  return { averageDays, sinceLastDays, overdue };
}
