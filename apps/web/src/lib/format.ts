import { formatMoney, type Money } from '@amolie/shared-kernel';

export function formatPrice(amountMinorUnits: number, currency = 'EUR'): string {
  return formatMoney({ amountMinorUnits, currency } satisfies Money, 'ru');
}

/**
 * Weekday and month names come from `Intl`, never from an array of Russian
 * strings: the calendar has to read as a calendar in the master's own
 * language, and a hand-written table is one locale that can never grow.
 *
 * Formatters are cached because a calendar builds them once per day cell and
 * constructing `Intl.DateTimeFormat` is the expensive part.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, cached);
  }
  return cached;
}

/** «ПН» / «PIR» / «MON» — upper case, because the calendar sets it as a label. */
export function weekdayShort(date: Date, locale: string): string {
  return formatter(locale, { weekday: 'short' }).format(date).replace(/\.$/, '').toUpperCase();
}

/** «янв» / «janv» / «Jan» — kept in the locale's own casing. */
export function monthShort(date: Date, locale: string): string {
  return formatter(locale, { month: 'short' }).format(date).replace(/\.$/, '');
}

/**
 * Seven short weekday names starting at Monday — the order Russian and
 * Latvian calendars are read in, which `Intl` does not give directly.
 */
export function mondayFirstWeekdays(locale: string): string[] {
  // 2024-01-01 was a Monday; any Monday would do.
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const label = formatter(locale, { weekday: 'short' }).format(day).replace(/\.$/, '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

export function formatDayMonth(date: Date, locale: string): string {
  return formatter(locale, { day: 'numeric', month: 'long' }).format(date);
}
