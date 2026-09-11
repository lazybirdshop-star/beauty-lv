import { formatPrice } from '@/lib/format';
import { fmt, type Messages } from '@/lib/i18n/messages';

import type { Compensation, RentPeriod } from './api';

type Terms = Pick<
  Compensation,
  'type' | 'percentBps' | 'rentAmount' | 'rentPeriod' | 'salaryAmount' | 'currency'
>;

/** 4550 → «45,5 %» в языке кабинета. */
export function formatPercent(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(
    bps / 10_000,
  );
}

function periodLabel(period: RentPeriod, t: Messages): string {
  if (period === 'day') return t.payroll.perDay;
  if (period === 'week') return t.payroll.perWeek;
  return t.payroll.perMonth;
}

/** Условия словами: «45 % от дохода», «аренда 300,00 € в месяц». */
export function describeTerms(terms: Terms, t: Messages, locale: string): string {
  const money = (value: number | null) => formatPrice(value ?? 0, terms.currency, locale);
  const percent = formatPercent(terms.percentBps ?? 0, locale);
  if (terms.type === 'percent') return fmt(t.payroll.termsPercent, { percent });
  if (terms.type === 'chair_rent') {
    return fmt(t.payroll.termsRent, {
      amount: money(terms.rentAmount),
      period: periodLabel(terms.rentPeriod ?? 'month', t),
    });
  }
  return fmt(t.payroll.termsSalary, { amount: money(terms.salaryAmount), percent });
}

/**
 * Условия, действующие в названный день, и те, что вступят позже.
 *
 * Две строки с одной датой — действует выпущенная позже: владелица поправила
 * ставку в тот же день. Правило то же, что у расчёта на сервере.
 */
export function currentTerms<T extends { effectiveFrom: string; createdAt: string }>(
  list: T[],
  dayKey: string,
): { current: T | null; upcoming: T[] } {
  const sorted = [...list].sort(
    (a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) || a.createdAt.localeCompare(b.createdAt),
  );
  const latestByDate = new Map<string, T>();
  for (const item of sorted) latestByDate.set(item.effectiveFrom, item);
  const unique = [...latestByDate.values()];
  return {
    current: unique.filter((item) => item.effectiveFrom <= dayKey).at(-1) ?? null,
    upcoming: unique.filter((item) => item.effectiveFrom > dayKey),
  };
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** «45», «45,5» → базисные пункты; больше ста процентов и мусор — `null`. */
export function parsePercent(value: string): number | null {
  const number = parseDecimal(value);
  if (number === null || number > 100) return null;
  return Math.round(number * 100);
}

/** «300», «1 200,50» → центы; мусор — `null`. */
export function parseMoney(value: string): number | null {
  const number = parseDecimal(value);
  return number === null ? null : Math.round(number * 100);
}

/** Соседний месяц: `2026-12` плюс один — `2027-01`. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/** «сентябрь 2026» в языке кабинета; UTC — у гражданского месяца нет пояса. */
export function monthLabel(month: string, locale: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1, 1)));
}

/** Границы гражданского месяца `YYYY-MM`, обе включительно. */
export function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year ?? 1970, monthNumber ?? 1, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}
