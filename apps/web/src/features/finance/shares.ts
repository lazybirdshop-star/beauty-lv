/**
 * Доли в целых процентах, которые в сумме дают ровно сто.
 *
 * Округление каждой доли по отдельности сумму не держит: четверо мастеров по
 * 25,4% давали 100%, а по 25,5% — уже 104%, и таблица противоречила сама себе
 * (критика 2026-09-24 насчитала 101%). Распределение по наибольшим остаткам
 * раздаёт недостающие проценты тем, у кого дробная часть больше, — так сумма
 * сходится, а порядок величин не искажается.
 *
 * Нулевая сумма — не ошибка: у салона за период может не быть дохода. Тогда
 * долей нет вовсе, и звать их нулями значит говорить о том, чего не было.
 */
export function sharePercents(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((value) => (Math.max(0, value) / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);

  /* Кому достанутся недостающие проценты: сначала наибольший остаток, при
     равных остатках — наибольшая доля, чтобы порядок был устойчив. */
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value), value }))
    .sort((a, b) => b.rest - a.rest || b.value - a.value || a.index - b.index);

  const result = [...floors];
  for (const row of order) {
    if (left <= 0) break;
    result[row.index] = (result[row.index] ?? 0) + 1;
    left -= 1;
  }
  return result;
}
