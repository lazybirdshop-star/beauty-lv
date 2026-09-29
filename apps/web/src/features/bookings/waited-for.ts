const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Сколько заявка ждёт ответа — в крупных единицах, а не в минутах. */
export interface Waited {
  /** `day` — целые сутки, `hour` — часы, `minute` — меньше часа. */
  unit: 'day' | 'hour' | 'minute';
  value: number;
}

/**
 * Во что превратить время создания заявки.
 *
 * Очередь печатала момент («со страницы записи, 23 сен, 06:27»): восемь
 * одинаковых отметок подряд читались непрокрученным сидом, а главное —
 * момент не отвечает на вопрос, который мастер задаёт, глядя на очередь:
 * «сколько человек уже ждёт» (критика 2026-09-28). Срок отвечает.
 *
 * Крупными единицами: «ждёт 5 дней» — про долг, «ждёт 312 минут» — про
 * арифметику. Меньше минуты — тоже минута: заявка, поданная только что,
 * ничего не ждёт, и ноль здесь был бы враньём наоборот.
 */
export function waitedFor(createdAt: string, now: number): Waited {
  const since = Math.max(0, now - new Date(createdAt).getTime());
  if (since >= DAY) return { unit: 'day', value: Math.floor(since / DAY) };
  if (since >= HOUR) return { unit: 'hour', value: Math.floor(since / HOUR) };
  return { unit: 'minute', value: Math.max(1, Math.floor(since / MINUTE)) };
}
