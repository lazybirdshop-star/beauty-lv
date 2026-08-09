import { describe, expect, it } from 'vitest';

import { groupSlotsByDay } from './group-by-day';
import type { PublishedSlot } from './types';

/**
 * Характеризационные тесты (шаг M0, BRAND_STYLE_ARCHITECTURE.md §12):
 * фиксируют текущее поведение группировки окон по дням как есть до переноса
 * в `engine/` на шаге M1.
 */

function makeSlot(id: string, date: string, time: string): PublishedSlot {
  return { id, date, time, iso: `${date}T${time}:00`, status: 'available' };
}

describe('groupSlotsByDay', () => {
  it('пустой список — пустой результат', () => {
    expect(groupSlotsByDay([], 'ru')).toEqual([]);
  });

  it('группирует по дате, дни сортируются по возрастанию', () => {
    const days = groupSlotsByDay(
      [makeSlot('b', '2026-02-11', '14:00'), makeSlot('a', '2026-02-10', '10:00')],
      'ru',
    );
    expect(days.map((day) => day.date)).toEqual(['2026-02-10', '2026-02-11']);
  });

  it('внутри дня окна сортируются по времени строкой', () => {
    const days = groupSlotsByDay(
      [
        makeSlot('c', '2026-02-10', '15:30'),
        makeSlot('a', '2026-02-10', '10:00'),
        makeSlot('b', '2026-02-10', '12:00'),
      ],
      'ru',
    );
    expect(days[0]!.slots.map((slot) => slot.id)).toEqual(['a', 'b', 'c']);
  });

  it('подпись дня недели и номер дня — из локали (ru)', () => {
    // 2026-02-10 — вторник, 2026-02-11 — среда.
    const days = groupSlotsByDay(
      [makeSlot('a', '2026-02-10', '10:00'), makeSlot('b', '2026-02-11', '11:00')],
      'ru',
    );
    expect(days[0]).toMatchObject({ date: '2026-02-10', weekdayShort: 'ВТ', dayNumber: 10 });
    expect(days[1]).toMatchObject({ date: '2026-02-11', weekdayShort: 'СР', dayNumber: 11 });
  });

  it('та же дата в другой локали даёт другую подпись (en)', () => {
    const days = groupSlotsByDay([makeSlot('a', '2026-02-10', '10:00')], 'en');
    expect(days[0]!.weekdayShort).toBe('TUE');
  });

  it('точка в конце короткой подписи срезается (lv)', () => {
    const days = groupSlotsByDay([makeSlot('a', '2026-02-10', '10:00')], 'lv');
    expect(days[0]!.weekdayShort).toBe('OTRD');
  });
});
