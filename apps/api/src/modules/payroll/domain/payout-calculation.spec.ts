import {
  amountForSpan,
  calculatePayout,
  daysBetween,
  isCivilDate,
  termSegments,
  type CompensationTerms,
  type DayRevenue,
} from './payout-calculation';

function terms(
  overrides: Partial<CompensationTerms> & Pick<CompensationTerms, 'type'>,
): CompensationTerms {
  return {
    id: `${overrides.type}-${overrides.effectiveFrom ?? '2026-09-01'}`,
    percentBps: null,
    rentAmount: null,
    rentPeriod: null,
    salaryAmount: null,
    effectiveFrom: '2026-09-01',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

function revenue(entries: Record<string, number>): Map<string, DayRevenue> {
  return new Map(Object.entries(entries).map(([day, amount]) => [day, { amount, bookings: 1 }]));
}

const SEPTEMBER = { periodStart: '2026-09-01', periodEnd: '2026-09-30' };

describe('гражданские даты', () => {
  it('считает дни включительно и не путается на переводе часов', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(31);
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(1);
  });

  it('отличает дату от похожей строки', () => {
    expect(isCivilDate('2026-02-29')).toBe(false);
    expect(isCivilDate('2028-02-29')).toBe(true);
    expect(isCivilDate('2026-9-1')).toBe(false);
  });
});

describe('calculatePayout — процент', () => {
  it('мастеру доля дохода, салону остаток', () => {
    const result = calculatePayout({
      ...SEPTEMBER,
      terms: [terms({ type: 'percent', percentBps: 4500 })],
      revenueByDay: revenue({ '2026-09-10': 10000 }),
    });

    expect(result).toMatchObject({ revenue: 10000, master: 4500, salon: 5500, uncoveredDays: 0 });
  });

  it('смена ставки посреди месяца делит период на отрезки', () => {
    const result = calculatePayout({
      ...SEPTEMBER,
      terms: [
        terms({ type: 'percent', percentBps: 4000 }),
        terms({ type: 'percent', percentBps: 5000, effectiveFrom: '2026-09-15' }),
      ],
      revenueByDay: revenue({ '2026-09-10': 1000, '2026-09-20': 1000 }),
    });

    expect(result.master).toBe(400 + 500);
    expect(result.segments.map((segment) => [segment.from, segment.to])).toEqual([
      ['2026-09-01', '2026-09-14'],
      ['2026-09-15', '2026-09-30'],
    ]);
  });

  it('исправление в тот же день побеждает исходные условия', () => {
    const [segment] = termSegments(
      [
        terms({ type: 'percent', percentBps: 3000, id: 'first' }),
        terms({
          type: 'percent',
          percentBps: 3500,
          id: 'fixed',
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
        }),
      ],
      '2026-09-01',
      '2026-09-30',
    );

    expect(segment?.terms?.id).toBe('fixed');
  });

  it('дни без условий — доход целиком у салона и названы числом', () => {
    const result = calculatePayout({
      ...SEPTEMBER,
      terms: [terms({ type: 'percent', percentBps: 5000, effectiveFrom: '2026-09-10' })],
      revenueByDay: revenue({ '2026-09-05': 2000, '2026-09-20': 2000 }),
    });

    expect(result).toMatchObject({ master: 1000, salon: 3000, uncoveredDays: 9 });
  });
});

describe('calculatePayout — аренда и оклад', () => {
  it('аренда за месяц вычитается из дохода мастера', () => {
    const result = calculatePayout({
      ...SEPTEMBER,
      terms: [terms({ type: 'chair_rent', rentAmount: 30000, rentPeriod: 'month' })],
      revenueByDay: revenue({ '2026-09-10': 50000 }),
    });

    expect(result).toMatchObject({ master: 20000, salon: 30000 });
  });

  it('в убыточный месяц сумма мастеру уходит в минус, а не обрезается нулём', () => {
    const result = calculatePayout({
      ...SEPTEMBER,
      terms: [terms({ type: 'chair_rent', rentAmount: 30000, rentPeriod: 'month' })],
      revenueByDay: revenue({ '2026-09-10': 10000 }),
    });

    expect(result.master).toBe(-20000);
  });

  it('недельная аренда — пропорционально дням', () => {
    expect(amountForSpan(7000, 'week', '2026-09-01', '2026-09-14')).toBe(14000);
  });

  it('месяц считается по календарю, а не по тридцати дням', () => {
    expect(amountForSpan(31000, 'month', '2026-10-01', '2026-10-31')).toBe(31000);
    expect(amountForSpan(30000, 'month', '2026-09-16', '2026-09-30')).toBe(15000);
  });

  it('оклад за половину месяца плюс процент', () => {
    const result = calculatePayout({
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      terms: [terms({ type: 'salary_plus_percent', salaryAmount: 100000, percentBps: 1000 })],
      revenueByDay: revenue({ '2026-09-03': 20000 }),
    });

    expect(result).toMatchObject({ master: 50000 + 2000, salon: 20000 - 52000 });
  });
});
