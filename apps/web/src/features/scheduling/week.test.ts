import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublishedSlot } from './types';
import { buildWeek, expandSlotTimes, formatDayLabel, formatWeekRange } from './week';

/**
 * Календарь мастера принадлежит салону.
 *
 * Пока сутки считались объектом `Date` с локальными `getDate`/`setHours`,
 * календарь говорил поясом устройства: у мастера дома это совпадало с поясом
 * салона случайно, а в поездке разъезжалось — окно, опубликованное на утро,
 * уезжало в соседнюю клетку, а форма «10:00–18:00» открывала окна на другое
 * реальное время, чем видела мастер.
 */

const RIGA = 'Europe/Riga';

function slot(startsAt: string, status: PublishedSlot['status'] = 'available'): PublishedSlot {
  return {
    id: startsAt,
    organizationMemberId: 'member',
    startsAt,
    status,
    hiddenAt: null,
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildWeek — клетки календаря салона', () => {
  it('раскладывает окна по суткам салона, а не по UTC', () => {
    // 16 августа, 01:00 по Риге — по UTC это ещё 15-е, 22:00.
    const week = buildWeek('2026-08-16', [slot('2026-08-15T22:00:00.000Z')], 'ru', RIGA);

    const sunday = week.find((day) => day.dateKey === '2026-08-16');
    const saturday = week.find((day) => day.dateKey === '2026-08-15');

    expect(sunday?.slots).toHaveLength(1);
    expect(saturday?.slots).toHaveLength(0);
  });

  it('неделя начинается с понедельника и держит семь дней', () => {
    const week = buildWeek('2026-08-16', [], 'ru', RIGA);
    expect(week.map((day) => day.dateKey)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
  });

  it('«сегодня» и «прошедший» — про клетку, а не про момент', () => {
    vi.useFakeTimers();
    // 16 августа, 01:30 по Риге. По UTC — ещё 15-е.
    vi.setSystemTime(new Date('2026-08-15T22:30:00.000Z'));

    const week = buildWeek('2026-08-16', [], 'ru', RIGA);
    const sunday = week.find((day) => day.dateKey === '2026-08-16')!;
    const saturday = week.find((day) => day.dateKey === '2026-08-15')!;

    expect(sunday.isToday).toBe(true);
    // Сегодняшнее утро прошедшим днём не является — даже в 01:30.
    expect(sunday.isPast).toBe(false);
    expect(saturday.isToday).toBe(false);
    expect(saturday.isPast).toBe(true);
  });

  it('номер дня берётся из клетки, а не из локальных часов', () => {
    const week = buildWeek('2026-08-16', [], 'ru', RIGA);
    expect(week.map((day) => day.dayNumber)).toEqual([10, 11, 12, 13, 14, 15, 16]);
  });
});

describe('expandSlotTimes — «10:00» это десять часов в салоне', () => {
  it('разворачивает окна по часам салона', () => {
    expect(expandSlotTimes(['2026-08-16'], 10 * 60, 12 * 60, 60, RIGA)).toEqual([
      '2026-08-16T07:00:00.000Z',
      '2026-08-16T08:00:00.000Z',
    ]);
  });

  it('зимой то же «10:00» — другой момент', () => {
    expect(expandSlotTimes(['2026-01-16'], 10 * 60, 11 * 60, 60, RIGA)).toEqual([
      '2026-01-16T08:00:00.000Z',
    ]);
  });

  it('вывернутый или нулевой промежуток ничего не публикует', () => {
    expect(expandSlotTimes(['2026-08-16'], 18 * 60, 10 * 60, 60, RIGA)).toEqual([]);
    expect(expandSlotTimes(['2026-08-16'], 10 * 60, 18 * 60, 0, RIGA)).toEqual([]);
  });

  it('скрытое окно не считается свободным', () => {
    /* Точка на полосе недели обещает мастеру, что в этот день клиенту ещё
       есть что выбрать. Скрытого клиент не видит вовсе, поэтому оно уходит в
       свой счёт, а не в «свободно». */
    const week = buildWeek(
      '2026-08-24',
      [
        slot('2026-08-24T09:00:00.000Z'),
        { ...slot('2026-08-24T10:00:00.000Z'), hiddenAt: '2026-08-23T12:00:00.000Z' },
      ],
      'ru',
      'UTC',
    );
    const monday = week[0]!;

    expect(monday.availableCount).toBe(1);
    expect(monday.hiddenCount).toBe(1);
    // Из календаря мастера окно никуда не делось — оно просто помечено.
    expect(monday.slots).toHaveLength(2);
  });
});

/**
 * Подпись над сеткой отвечает за то, что нарисовано, и делает это на языке
 * мастера.
 *
 * Диапазон собирался руками — число, тире, «день месяца», — и знал порядок
 * слов одного языка: по-русски выходило верное «7–13 сентября», по-английски
 * «7 — September 13». Дневной вид при этом подписывался неделей: над одним
 * вторником стояло «7 — 13 сентября», а стрелки двигали на сутки.
 */
describe('подпись календаря', () => {
  const week = buildWeek('2026-09-09', [], 'ru', 'UTC');

  it('ставит месяц по правилам языка, а не по русскому порядку слов', () => {
    expect(formatWeekRange(week, 'en', 'UTC')).toBe('September 7 – 13');
    expect(formatWeekRange(week, 'ru', 'UTC')).toBe('7–13 сентября');
  });

  it('через границу месяца называет оба месяца', () => {
    const across = buildWeek('2026-09-02', [], 'ru', 'UTC');
    expect(formatWeekRange(across, 'ru', 'UTC')).toBe('31 августа – 6 сентября');
  });

  /* Пробелы вокруг тире у Node и у браузера приходят из разных версий ICU:
     без приведения к обычному та же строка расходилась между разметкой с
     сервера и первой гидратацией. */
  it('не оставляет в диапазоне неразрывных и тонких пробелов', () => {
    expect(formatWeekRange(week, 'en', 'UTC')).not.toMatch(
      /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/,
    );
  });

  it('дневной вид подписан днём, а не неделей вокруг него', () => {
    const wednesday = week.find((day) => day.dateKey === '2026-09-09');
    expect(formatDayLabel(wednesday, 'ru', 'UTC')).toBe('среда, 9 сентября');
    expect(formatDayLabel(undefined, 'ru', 'UTC')).toBe('');
  });
});
