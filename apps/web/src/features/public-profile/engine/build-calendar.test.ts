import { describe, expect, it } from 'vitest';

import { addMonths, buildMonth, monthKey, monthsWithSlots, weekdayHeaders } from './build-calendar';
import type { DaySlots, PublishedSlot } from './types';

/**
 * Характеризационные тесты (шаг M0, BRAND_STYLE_ARCHITECTURE.md §12):
 * фиксируют поведение календарной математики после переноса в `engine/`
 * на шаге M1. Шапка недели — уже локализуемая (`weekdayHeaders`, фикс
 * DESIGN_AUDIT.md P1-5): для `ru` вывод побайтово совпадает с прежним
 * массивом `WEEKDAY_HEADERS_RU`, поэтому визуальные базлайны M0 не двигаются.
 */

function makeSlot(id: string, date: string, time: string, status = 'available'): PublishedSlot {
  return { id, date, time, iso: `${date}T${time}:00`, status: status as PublishedSlot['status'] };
}

function makeDay(date: string, slots: PublishedSlot[]): DaySlots {
  const sample = new Date(`${date}T00:00:00`);
  return { date, weekdayShort: '', dayNumber: sample.getDate(), slots };
}

describe('weekdayHeaders', () => {
  it('ru: семь подписей, понедельник первый — совпадает с прежним массивом', () => {
    expect(weekdayHeaders('ru')).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  });

  it('шапка следует за локалью страницы, а не захардкожена (P1-5)', () => {
    const lv = weekdayHeaders('lv');
    const en = weekdayHeaders('en');
    expect(lv).toHaveLength(7);
    expect(en).toHaveLength(7);
    // Латышские и английские короткие имена не совпадают с русскими.
    expect(lv.join(' ')).not.toBe(weekdayHeaders('ru').join(' '));
    expect(en.join(' ')).not.toBe(weekdayHeaders('ru').join(' '));
  });
});

describe('monthKey', () => {
  it('нулевое дополнение месяца', () => {
    expect(monthKey(2026, 0)).toBe('2026-01');
    expect(monthKey(2026, 11)).toBe('2026-12');
  });
});

describe('addMonths', () => {
  it('внутри года', () => {
    expect(addMonths(2026, 5, 1)).toEqual({ year: 2026, month: 6 });
    expect(addMonths(2026, 5, -1)).toEqual({ year: 2026, month: 4 });
  });

  it('через границу года в обе стороны', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('buildMonth', () => {
  it('февраль 2026 (начинается в воскресенье): 5 недель, сетка с понедельника 26 января', () => {
    const calendar = buildMonth(2026, 1, []);
    expect(calendar.year).toBe(2026);
    expect(calendar.month).toBe(1);
    expect(calendar.weeks).toHaveLength(5);

    const firstWeek = calendar.weeks[0]!;
    expect(firstWeek.key).toBe('2026-01-26');
    expect(firstWeek.cells.map((cell) => cell.date)).toEqual([
      '2026-01-26',
      '2026-01-27',
      '2026-01-28',
      '2026-01-29',
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
    ]);

    const lastWeek = calendar.weeks[4]!;
    expect(lastWeek.cells[0]!.date).toBe('2026-02-23');
    expect(lastWeek.cells[6]!.date).toBe('2026-03-01');
  });

  it('inMonth различает дни соседних месяцев', () => {
    const calendar = buildMonth(2026, 1, []);
    const janCell = calendar.weeks[0]!.cells[0]!;
    expect(janCell.date).toBe('2026-01-26');
    expect(janCell.inMonth).toBe(false);

    const febCell = calendar.weeks[2]!.cells[1]!;
    expect(febCell.date).toBe('2026-02-10');
    expect(febCell.inMonth).toBe(true);
  });

  it('февраль 2021 (понедельник, 28 дней): ровно 4 недели без чужих дней', () => {
    const calendar = buildMonth(2021, 1, []);
    expect(calendar.weeks).toHaveLength(4);
    expect(calendar.weeks[0]!.cells[0]!.date).toBe('2021-02-01');
    expect(calendar.weeks[3]!.cells[6]!.date).toBe('2021-02-28');
    expect(calendar.weeks.flatMap((week) => week.cells).every((cell) => cell.inMonth)).toBe(true);
  });

  it('май 2021 (суббота, 31 день): 6 недель — потолок сетки', () => {
    const calendar = buildMonth(2021, 4, []);
    expect(calendar.weeks).toHaveLength(6);
    expect(calendar.weeks[0]!.cells[0]!.date).toBe('2021-04-26');
    expect(calendar.weeks[5]!.cells[0]!.date).toBe('2021-05-31');
    expect(calendar.weeks[5]!.cells[0]!.inMonth).toBe(true);
  });

  it('день с окнами находится по дате; availableCount считает только available', () => {
    const day = makeDay('2026-02-10', [
      makeSlot('s1', '2026-02-10', '10:00'),
      makeSlot('s2', '2026-02-10', '12:00', 'booked'),
      makeSlot('s3', '2026-02-10', '15:30'),
    ]);
    const calendar = buildMonth(2026, 1, [day]);

    const cell = calendar.weeks
      .flatMap((week) => week.cells)
      .find((candidate) => candidate.date === '2026-02-10')!;
    expect(cell.day).toBe(day);
    expect(cell.availableCount).toBe(2);
    expect(cell.dayNumber).toBe(10);
  });

  it('день вне списка: day null и availableCount 0 — ячейка инертна', () => {
    const calendar = buildMonth(2026, 1, []);
    const cell = calendar.weeks
      .flatMap((week) => week.cells)
      .find((candidate) => candidate.date === '2026-02-11')!;
    expect(cell.day).toBeNull();
    expect(cell.availableCount).toBe(0);
  });

  it('ключ недели — дата её первого дня', () => {
    const calendar = buildMonth(2026, 1, []);
    for (const week of calendar.weeks) {
      expect(week.key).toBe(week.cells[0]!.date);
    }
  });
});

describe('monthsWithSlots', () => {
  it('месяцы с окнами — уникальный набор YYYY-MM', () => {
    const days = [makeDay('2026-02-10', []), makeDay('2026-02-11', []), makeDay('2026-03-03', [])];
    expect(monthsWithSlots(days)).toEqual(new Set(['2026-02', '2026-03']));
  });

  it('пустой список — пустой набор', () => {
    expect(monthsWithSlots([])).toEqual(new Set());
  });
});
