import { describe, expect, it } from 'vitest';

import { fillWeeks, weekBars } from './weekly-series';

/**
 * Недельные графики панели платформы (FIX.md F-28).
 *
 * `GROUP BY` отдаёт только те недели, в которых были строки, и график ставил
 * два столбца, разнесённых на месяц, вплотную друг к другу: столбчатый график
 * по времени обещает равный шаг, и пропуск в данных превращался в неверную
 * картинку. Подписи при этом были голыми числами дня — «27», «3», «10», «24».
 */

/** Среда: понедельник её недели — 26 августа 2026. */
const WEDNESDAY = new Date(2026, 7, 26, 12, 0, 0);

describe('fillWeeks', () => {
  it('пустые недели стоят нулями, а не пропускаются', () => {
    const filled = fillWeeks([{ week: '2026-08-24', value: 3 }], 4, WEDNESDAY);

    expect(filled).toHaveLength(4);
    expect(filled.map((point) => point.value)).toEqual([0, 0, 0, 3]);
  });

  it('недели идут подряд с шагом в семь дней', () => {
    const filled = fillWeeks([], 3, WEDNESDAY);

    expect(filled.map((point) => point.week)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
  });

  it('последняя неделя — та, в которую попал сегодняшний день', () => {
    expect(fillWeeks([], 1, WEDNESDAY)[0]?.week).toBe('2026-08-24');
  });

  it('воскресенье принадлежит начавшейся в понедельник неделе', () => {
    // `getDay()` считает воскресенье нулём, и без поправки оно уехало бы
    // вперёд на шесть дней — в неделю, которая ещё не начиналась.
    const sunday = new Date(2026, 7, 30, 12, 0, 0);
    expect(fillWeeks([], 1, sunday)[0]?.week).toBe('2026-08-24');
  });

  it('данные вне окна в ряд не попадают', () => {
    const filled = fillWeeks([{ week: '2020-01-06', value: 99 }], 2, WEDNESDAY);

    expect(filled.every((point) => point.value === 0)).toBe(true);
  });
});

describe('weekBars', () => {
  it('подпись столбика — номер недели по ISO', () => {
    // 24 августа 2026 — понедельник 35-й недели года.
    const [bar] = weekBars([{ week: '2026-08-24', value: 1 }], 'ru', 'записей');

    expect(bar?.label).toBe('W35');
  });

  it('всплывающая подпись называет дату недели и число', () => {
    const [bar] = weekBars([{ week: '2026-08-24', value: 7 }], 'ru', 'записей');

    expect(bar?.title).toContain('24');
    expect(bar?.title).toContain('7 записей');
  });

  it('номер недели не сбивается на границе года', () => {
    // 29 декабря 2025 — понедельник первой недели 2026 года по ISO 8601.
    const [bar] = weekBars([{ week: '2025-12-29', value: 0 }], 'ru', 'записей');

    expect(bar?.label).toBe('W1');
  });
});
