import type { Booking } from '../bookings/types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ближе этого — один приход в салон, а не два возврата. */
const SAME_VISIT_MS = 20 * 60 * 60 * 1000;
/**
 * Короче этого история не годится в привычку.
 *
 * Семь визитов за пять дней — это событие (свадьба, съёмка, курс
 * процедур), а не ритм, и «приходит раз в день» из них выводить нельзя.
 * Привычка требует не только числа приходов, но и срока, на котором она
 * себя показала.
 */
const MIN_SPAN_DAYS = 14;

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
 * Ритм считается по возвратам, а не по записям. Два визита одного дня —
 * стрижка и окрашивание подряд — это один приход, и промежуток между ними
 * нулевой; из шести таких записей выходила медиана в сутки и вывод
 * «приходит раз в день» при шести визитах за месяц (критика 2026-09-27).
 *
 * `overdue` не ставится, когда человек уже записан наперёд: он не «пропал»,
 * он придёт.
 */
export function visitRhythm(
  history: readonly Booking[],
  now: number,
  hasUpcoming: boolean,
): VisitRhythm | null {
  const visits = history
    .filter((booking) => booking.status === 'completed')
    .map((booking) => new Date(booking.startsAt).getTime())
    .sort((a, b) => a - b);

  /* Приход, а не запись: соседние визиты ближе двадцати часов — один визит в
     салон. Часами, а не календарным днём: у вечернего визита и утреннего
     следующего дня разные сутки, но один пояс здесь неизвестен, а
     двадцатичасовой порог отвечает на тот же вопрос и не зависит от него. */
  const returns: number[] = [];
  for (const at of visits)
    if (!returns.length || at - returns[returns.length - 1]! >= SAME_VISIT_MS) returns.push(at);
  if (returns.length < 3) return null;

  const span = (returns[returns.length - 1]! - returns[0]!) / DAY_MS;
  if (span < MIN_SPAN_DAYS) return null;

  const gaps: number[] = [];
  for (let index = 1; index < returns.length; index += 1) {
    gaps.push((returns[index]! - returns[index - 1]!) / DAY_MS);
  }
  gaps.sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  const averageDays = Math.round(
    gaps.length % 2 ? gaps[middle]! : (gaps[middle - 1]! + gaps[middle]!) / 2,
  );
  if (averageDays <= 0) return null;

  const sinceLastDays = Math.floor((now - returns[returns.length - 1]!) / DAY_MS);
  /* Запас в четверть промежутка: клиент, опоздавший на день, ещё не пропал. */
  const overdue = !hasUpcoming && sinceLastDays > averageDays * 1.25;

  return { averageDays, sinceLastDays, overdue };
}
