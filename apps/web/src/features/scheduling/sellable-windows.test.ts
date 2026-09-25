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

  it('окно, которое идёт прямо сейчас, ещё продаётся', () => {
    /* 10:40: окно 10:30–11:00 кончится только через двадцать минут. */
    expect(sellableWindows(day, 640).map((w) => w.from)).toEqual([630, 1020]);
  });

  it('не сегодняшний день отдаёт как есть', () => {
    expect(sellableWindows(day, null)).toHaveLength(3);
  });

  it('после последнего окна не остаётся ничего', () => {
    expect(sellableWindows(day, 1100)).toEqual([]);
  });
});
