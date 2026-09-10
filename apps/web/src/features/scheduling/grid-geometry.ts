import { civilToInstant } from '@/lib/civil-date';

import { HOUR, SLOT_MINUTES } from './calendar-model';

/**
 * Геометрия сетки: пиксели под пальцем ↔ минуты дня ↔ момент времени.
 *
 * Отдельно от разметки и от обработчиков указателя, потому что ошибка здесь
 * не роняет экран, а тихо ставит визит на четверть часа мимо, — и заметит это
 * клиент, пришедший не вовремя.
 */

/** Шаг переноса визита: точнее рука не попадает, грубее — не хватает. */
export const MOVE_STEP = 15;
/** Шаг выделения: окно длится полчаса, и открывать четверть окна нечего. */
export const SELECT_STEP = SLOT_MINUTES;
/** Сколько проехать, прежде чем нажатие станет перетаскиванием. */
export const DRAG_SLOP_PX = 6;

export interface MinuteRange {
  from: number;
  to: number;
}

/** Минуты дня под точкой колонки — к ближайшему шагу. */
export function minutesAtOffset(offsetY: number, start: number, step: number): number {
  const raw = start + (offsetY / HOUR) * 60;
  return Math.round(raw / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Отрезок между двумя точками выделения — в любом порядке и не короче шага.
 *
 * Тянуть вверх так же законно, как вниз, а короткое нажатие с дрожью руки не
 * должно выделять ноль минут.
 */
export function rangeBetween(a: number, b: number, step: number = SELECT_STEP): MinuteRange {
  const from = Math.floor(Math.min(a, b) / step) * step;
  const to = Math.max(from + step, Math.ceil(Math.max(a, b) / step) * step);
  return { from, to };
}

/**
 * Колонка под точкой — по прямоугольникам колонок, а не по элементу под
 * пальцем: под ним едет призрак перетаскиваемого визита. За краем сетки —
 * крайняя колонка, а не «никуда»: визит, вытянутый чуть дальше последнего
 * мастера, остаётся у последнего.
 */
export function columnIndexAt(
  x: number,
  rects: readonly { left: number; right: number }[],
): number {
  if (rects.length === 0) return -1;
  const inside = rects.findIndex((rect) => x >= rect.left && x < rect.right);
  if (inside !== -1) return inside;
  return x < rects[0]!.left ? 0 : rects.length - 1;
}

/** Момент времени клетки — в поясе заведения, а не устройства. */
export function instantAt(dateKey: string, minutes: number, timeZone: string): string {
  return civilToInstant(
    dateKey as Parameters<typeof civilToInstant>[0],
    minutes,
    timeZone,
  ).toISOString();
}
