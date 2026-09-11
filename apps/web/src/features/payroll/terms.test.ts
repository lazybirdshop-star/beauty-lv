import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import {
  currentTerms,
  describeTerms,
  monthBounds,
  parseMoney,
  parsePercent,
  shiftMonth,
} from './terms';

describe('разбор чисел формы', () => {
  it('процент — с запятой и точкой, не больше ста', () => {
    expect(parsePercent('45')).toBe(4500);
    expect(parsePercent('45,5')).toBe(4550);
    expect(parsePercent('101')).toBeNull();
    expect(parsePercent('сорок')).toBeNull();
    expect(parsePercent('')).toBeNull();
  });

  it('деньги — в центы, пробелы тысяч не мешают', () => {
    expect(parseMoney('300')).toBe(30000);
    expect(parseMoney('1 200,50')).toBe(120050);
    expect(parseMoney('-5')).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('переходит через границу года в обе стороны', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('monthBounds', () => {
  it('знает длину месяца и високосный февраль', () => {
    expect(monthBounds('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(monthBounds('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});

describe('currentTerms', () => {
  const row = (
    effectiveFrom: string,
    createdAt = '2026-01-01T00:00:00.000Z',
    id = effectiveFrom,
  ) => ({
    id,
    effectiveFrom,
    createdAt,
  });

  it('действующие — последние начавшиеся, будущие — отдельно', () => {
    const { current, upcoming } = currentTerms(
      [row('2026-01-01'), row('2026-06-01'), row('2026-10-01')],
      '2026-09-11',
    );

    expect(current?.id).toBe('2026-06-01');
    expect(upcoming.map((item) => item.id)).toEqual(['2026-10-01']);
  });

  it('исправление в тот же день побеждает', () => {
    const { current } = currentTerms(
      [
        row('2026-06-01', '2026-06-01T09:00:00.000Z', 'first'),
        row('2026-06-01', '2026-06-01T10:00:00.000Z', 'fixed'),
      ],
      '2026-09-11',
    );

    expect(current?.id).toBe('fixed');
  });
});

describe('describeTerms', () => {
  it('называет вид расчёта словами', () => {
    const base = {
      percentBps: null,
      rentAmount: null,
      rentPeriod: null,
      salaryAmount: null,
      currency: 'EUR',
    };

    expect(describeTerms({ ...base, type: 'percent', percentBps: 4500 }, ru, 'ru')).toContain('45');
    expect(
      describeTerms(
        { ...base, type: 'chair_rent', rentAmount: 30000, rentPeriod: 'week' },
        ru,
        'ru',
      ),
    ).toContain(ru.payroll.perWeek);
  });
});
