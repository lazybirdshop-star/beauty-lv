import { civilToInstant, FALLBACK_TIMEZONE, type DateKey } from '@/lib/civil-date';
import { dayKey } from '@/lib/format';
import type { TimeWindow } from '@/lib/time-window';

/**
 * За какой срок мастер смотрит деньги.
 *
 * Четыре, а не свободный выбор дат: вопрос у неё календарный — «как прошёл
 * месяц», «как идёт год», — а не «с 3 марта по 17 мая». Произвольный диапазон
 * это отдельный инструмент, и он нужен бухгалтеру, которого у продукта нет.
 */
export type FinancePeriod = 'month' | 'quarter' | 'year' | 'all';

export const FINANCE_PERIODS: FinancePeriod[] = ['month', 'quarter', 'year', 'all'];

/** Незнакомое значение из адреса — это «месяц», а не пустой экран. */
export function parseFinancePeriod(value: string | undefined): FinancePeriod {
  return FINANCE_PERIODS.find((period) => period === value) ?? 'month';
}

/** Сколько месяцев назад начинается период. «Этот месяц» — ноль. */
const MONTHS_BACK: Record<Exclude<FinancePeriod, 'all'>, number> = {
  month: 0,
  quarter: 2,
  year: 11,
};

/**
 * Первое число месяца, отстоящего от месяца `key` на `months` назад.
 *
 * Арифметика по UTC над разобранной датой: месяцы разной длины, и «минус два
 * месяца» через вычитание миллисекунд даёт то 60, то 62 дня. `Date` с нулевым
 * днём месяца сам нормализует переход через год.
 */
function monthStartKey(key: DateKey, monthsBack: number): DateKey {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 - monthsBack, 1));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

/**
 * Границы периода в поясе салона.
 *
 * Периоды **календарные**, а не скользящие: «месяц» это текущий месяц с
 * первого числа, а не последние тридцать дней. Так мастер о них и думает, и
 * только так сравнение с предыдущим периодом означает «прошлый месяц», а не
 * «предыдущие тридцать дней», которые наполовину перекрывают этот.
 *
 * Правая граница — первое число следующего месяца: полуинтервал `[from, to)`,
 * так что сегодняшний визит в текущий месяц попадает, а завтрашний месяц не
 * прихватывается.
 *
 * «Всё время» — пустое окно: границ нет, и сервер отвечает по всей истории.
 */
export function financePeriodWindow(period: FinancePeriod, timeZone?: string): TimeWindow {
  if (period === 'all') return {};

  const zone = timeZone ?? FALLBACK_TIMEZONE;
  const today = dayKey(new Date(), zone);

  return {
    from: civilToInstant(monthStartKey(today, MONTHS_BACK[period]), 0, zone),
    to: civilToInstant(monthStartKey(today, -1), 0, zone),
  };
}
