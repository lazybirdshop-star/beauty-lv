import { describe, expect, it } from 'vitest';

import { HOUR } from './calendar-model';
import { clamp, columnIndexAt, instantAt, minutesAtOffset, rangeBetween } from './grid-geometry';

describe('minutesAtOffset', () => {
  it('переводит пиксели в минуты дня от начала шкалы и прилипает к шагу', () => {
    /* Шкала с 8:00, полтора часа вниз и ещё семь минут — это 9:37 → 9:30 при шаге 15. */
    expect(minutesAtOffset(1.5 * HOUR + (7 / 60) * HOUR, 8 * 60, 15)).toBe(9 * 60 + 30);
  });

  it('округляет к ближайшему, а не вниз', () => {
    expect(minutesAtOffset((9 / 60) * HOUR, 600, 15)).toBe(615);
  });
});

describe('rangeBetween', () => {
  it('тянуть вверх так же законно, как вниз', () => {
    expect(rangeBetween(840, 600)).toEqual({ from: 600, to: 840 });
  });

  it('дрожь руки не выделяет ноль минут', () => {
    expect(rangeBetween(600, 600)).toEqual({ from: 600, to: 630 });
  });
});

describe('columnIndexAt', () => {
  const rects = [
    { left: 52, right: 208 },
    { left: 208, right: 364 },
  ];

  it('находит колонку под точкой', () => {
    expect(columnIndexAt(300, rects)).toBe(1);
  });

  it('за краем сетки — крайняя колонка', () => {
    expect(columnIndexAt(10, rects)).toBe(0);
    expect(columnIndexAt(900, rects)).toBe(1);
    expect(columnIndexAt(10, [])).toBe(-1);
  });
});

describe('clamp и instantAt', () => {
  it('держит значение в границах', () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it('клетка «10:30» — это 10:30 в Риге, а не на устройстве', () => {
    /* Сентябрь в Риге — UTC+3. */
    expect(instantAt('2026-09-10', 10 * 60 + 30, 'Europe/Riga')).toBe('2026-09-10T07:30:00.000Z');
  });
});
