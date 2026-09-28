import { describe, expect, it } from 'vitest';

import { monthGrid, shiftMonth } from './month-grid';

describe('monthGrid', () => {
  it('всегда шесть недель по семь дней', () => {
    for (const month of ['2026-02-10', '2026-09-01', '2027-01-31']) {
      expect(monthGrid(month)).toHaveLength(42);
    }
  });

  it('начинается с понедельника недели, в которую попало первое число', () => {
    /* 1 сентября 2026 — вторник, значит сетка открывается 31 августа. */
    expect(monthGrid('2026-09-15')[0]).toEqual({ key: '2026-08-31', day: 31, outside: true });
  });

  it('дни своего месяца не помечены чужими', () => {
    const own = monthGrid('2026-09-15').filter((day) => !day.outside);

    expect(own).toHaveLength(30);
    expect(own[0]!.key).toBe('2026-09-01');
    expect(own[own.length - 1]!.key).toBe('2026-09-30');
  });

  it('дни идут подряд, без дыр на переводе часов', () => {
    const grid = monthGrid('2026-03-15');

    expect(grid.map((day) => day.key)).toEqual(
      Array.from({ length: 42 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 1, 23 + index));
        return date.toISOString().slice(0, 10);
      }),
    );
  });

  it('мусор вместо даты сетки не строит', () => {
    expect(monthGrid('вчера')).toEqual([]);
  });
});

describe('shiftMonth', () => {
  it('ведёт к первому числу соседнего месяца', () => {
    expect(shiftMonth('2026-09-15', 1)).toBe('2026-10-01');
    expect(shiftMonth('2026-09-15', -1)).toBe('2026-08-01');
  });

  it('31 января, сдвинутое на месяц, не становится мартом', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('через границу года', () => {
    expect(shiftMonth('2026-12-10', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-10', -1)).toBe('2025-12-01');
  });
});
