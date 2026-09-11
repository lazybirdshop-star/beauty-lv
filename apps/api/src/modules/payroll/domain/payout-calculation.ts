/**
 * Расчёт ведомости — чистые функции, без базы (SALON.md §7.2–§7.3).
 *
 * Все даты — гражданские `YYYY-MM-DD` в поясе заведения, границы периода
 * включительно. Дни считаются полночами UTC, а не местного времени:
 * гражданский день не знает перевода часов, и считать его миллисекундами
 * местного времени значило бы однажды получить 30,96 дня в октябре.
 */

export type CompensationType = 'percent' | 'chair_rent' | 'salary_plus_percent';
export type RentPeriod = 'day' | 'week' | 'month';

export interface CompensationTerms {
  id: string;
  type: CompensationType;
  percentBps: number | null;
  rentAmount: number | null;
  rentPeriod: RentPeriod | null;
  salaryAmount: number | null;
  effectiveFrom: string;
  createdAt: Date;
}

export interface DayRevenue {
  amount: number;
  bookings: number;
}

export interface PayoutSegment {
  from: string;
  to: string;
  days: number;
  compensationId: string | null;
  type: CompensationType | null;
  percentBps: number | null;
  rentAmount: number | null;
  rentPeriod: RentPeriod | null;
  salaryAmount: number | null;
  revenue: number;
  bookings: number;
  master: number;
  salon: number;
}

export interface PayoutCalculation {
  revenue: number;
  bookings: number;
  master: number;
  salon: number;
  /** Дни периода, на которые у мастера не было условий: их доход целиком у салона. */
  uncoveredDays: number;
  segments: PayoutSegment[];
}

const DAY_MS = 24 * 60 * 60_000;
const BPS = 10_000;

function toMs(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function toKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isCivilDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(toMs(value)) === value;
}

export function addDays(key: string, days: number): string {
  return toKey(toMs(key) + days * DAY_MS);
}

/** Сколько дней в отрезке, обе границы включительно. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS) + 1;
}

function lastDayOfMonth(key: string): string {
  return toKey(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0));
}

/**
 * Какие условия действовали в какие дни периода.
 *
 * Условия с одной датой начала — последние по времени выпуска: владелица
 * поправила ставку в тот же день, и действует исправление. Отрезок без
 * условий (мастер пришла раньше, чем их поставили) возвращается с `terms: null`.
 */
export function termSegments(
  terms: CompensationTerms[],
  periodStart: string,
  periodEnd: string,
): { from: string; to: string; terms: CompensationTerms | null }[] {
  const byDate = new Map<string, CompensationTerms>();
  const sorted = [...terms].sort(
    (a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const item of sorted) byDate.set(item.effectiveFrom, item);
  const ordered = [...byDate.values()].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );

  let current = ordered.filter((item) => item.effectiveFrom <= periodStart).at(-1) ?? null;
  let cursor = periodStart;
  const segments: { from: string; to: string; terms: CompensationTerms | null }[] = [];

  for (const change of ordered.filter(
    (item) => item.effectiveFrom > periodStart && item.effectiveFrom <= periodEnd,
  )) {
    segments.push({ from: cursor, to: addDays(change.effectiveFrom, -1), terms: current });
    cursor = change.effectiveFrom;
    current = change;
  }
  segments.push({ from: cursor, to: periodEnd, terms: current });
  return segments;
}

/**
 * Сумма за отрезок у ставки «за день / неделю / месяц» — без округления.
 *
 * Месяц считается по календарю: сентябрь делится на 30, октябрь на 31, и
 * аренда за целый месяц равна ровно одной аренде, в каком бы месяце это ни было.
 */
export function amountForSpan(
  amount: number,
  period: RentPeriod,
  from: string,
  to: string,
): number {
  if (period === 'day') return amount * daysBetween(from, to);
  if (period === 'week') return (amount * daysBetween(from, to)) / 7;

  let total = 0;
  let cursor = from;
  while (cursor <= to) {
    const monthEnd = lastDayOfMonth(cursor);
    const spanEnd = monthEnd < to ? monthEnd : to;
    total +=
      (amount * daysBetween(cursor, spanEnd)) / daysBetween(`${cursor.slice(0, 8)}01`, monthEnd);
    cursor = addDays(spanEnd, 1);
  }
  return total;
}

/**
 * Ведомость одного мастера за период.
 *
 * - процент — мастеру доля дохода;
 * - аренда кресла — мастеру доход за вычетом аренды; в убыточный период сумма
 *   уходит в минус, и это не ошибка расчёта, а реальность арендной модели;
 * - оклад плюс процент — оклад за дни периода и доля дохода; салону остаётся
 *   разница, которая тоже может быть отрицательной.
 *
 * Округление — на каждом отрезке, до целых центов, и салону идёт ровно
 * остаток: мастер + салон = доход, без потерянного цента.
 */
export function calculatePayout(input: {
  periodStart: string;
  periodEnd: string;
  terms: CompensationTerms[];
  revenueByDay: ReadonlyMap<string, DayRevenue>;
}): PayoutCalculation {
  const segments = termSegments(input.terms, input.periodStart, input.periodEnd).map(
    ({ from, to, terms }): PayoutSegment => {
      let revenue = 0;
      let bookings = 0;
      for (let day = from; day <= to; day = addDays(day, 1)) {
        const entry = input.revenueByDay.get(day);
        if (entry) {
          revenue += entry.amount;
          bookings += entry.bookings;
        }
      }

      let master = 0;
      if (terms?.type === 'percent') {
        master = (revenue * (terms.percentBps ?? 0)) / BPS;
      } else if (terms?.type === 'chair_rent') {
        master =
          revenue - amountForSpan(terms.rentAmount ?? 0, terms.rentPeriod ?? 'month', from, to);
      } else if (terms?.type === 'salary_plus_percent') {
        master =
          amountForSpan(terms.salaryAmount ?? 0, 'month', from, to) +
          (revenue * (terms.percentBps ?? 0)) / BPS;
      }
      master = Math.round(master);

      return {
        from,
        to,
        days: daysBetween(from, to),
        compensationId: terms?.id ?? null,
        type: terms?.type ?? null,
        percentBps: terms?.percentBps ?? null,
        rentAmount: terms?.rentAmount ?? null,
        rentPeriod: terms?.rentPeriod ?? null,
        salaryAmount: terms?.salaryAmount ?? null,
        revenue,
        bookings,
        master,
        salon: revenue - master,
      };
    },
  );

  return {
    revenue: segments.reduce((sum, segment) => sum + segment.revenue, 0),
    bookings: segments.reduce((sum, segment) => sum + segment.bookings, 0),
    master: segments.reduce((sum, segment) => sum + segment.master, 0),
    salon: segments.reduce((sum, segment) => sum + segment.salon, 0),
    uncoveredDays: segments
      .filter((segment) => segment.type === null)
      .reduce((sum, segment) => sum + segment.days, 0),
    segments,
  };
}
