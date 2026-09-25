import { describe, expect, it } from 'vitest';

import { sellableWindows } from './calendar-model';
import type { FreeWindow } from './calendar-model';

const window = (from: number, to: number): FreeWindow =>
  ({
    first: { id: `${from}`, at: from, hidden: false, windowId: 'w' },
    from,
    to,
    hidden: false,
    count: 1,
  }) as FreeWindow;

describe('sellableWindows', () => {
  const day = [window(600, 630), window(630, 660), window(1020, 1050)];

  it('в 11:10 не предлагает утро, которое прошло', () => {
    expect(sellableWindows(day, 670).map((w) => w.from)).toEqual([1020]);
  });

  it('начатое окно не продаётся: начать визит посреди получаса нельзя', () => {
    /* 10:40 — ближайшая граница 11:00, и окно 10:30–11:00 уже не продать. */
    expect(sellableWindows(day, 640).map((w) => w.from)).toEqual([1020]);
  });

  it('у длинного окна остаётся продаваемый хвост', () => {
    /* Окно 10:00–12:00 в 10:40 продаётся с 11:00. */
    const long = [window(600, 720)];
    expect(sellableWindows(long, 640)).toEqual([expect.objectContaining({ from: 660, to: 720 })]);
  });

  it('ровная граница не съедает следующее окно', () => {
    /* Ровно 10:30: 10:30–11:00 начать уже поздно, 11:00 ещё можно. */
    expect(sellableWindows([window(630, 660), window(660, 690)], 630).map((w) => w.from)).toEqual([
      660,
    ]);
  });

  it('не сегодняшний день отдаёт как есть', () => {
    expect(sellableWindows(day, null)).toHaveLength(3);
  });

  it('после последнего окна не остаётся ничего', () => {
    expect(sellableWindows(day, 1100)).toEqual([]);
  });
});
