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

/* ── Время ─────────────────────────────────────────────────────────────
 * Часы всегда 24-часовые, во всех языках интерфейса.
 *
 * `Intl` выбирает цикл по локали, и английская даёт «10:00 AM» — в продукте,
 * где рабочий день мастера расписан окнами, это чужая мерка: «10:00 AM» и
 * «10:00» стоят рядом в одном списке и читаются как разное время. Час — это
 * данные расписания, а не языковая привычка, поэтому цикл задаётся явно и
 * одинаково: `h23`, а не `hour12: false` — последний в части сред отдаёт
 * полночь как «24:00».
 *
 * Дату `Intl` по-прежнему пишет на языке мастера: порядок дня и месяца —
 * ровно та часть, которая языку и принадлежит.
 */
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

/** «09:30» — час и минута, 24-часовые в любой локали. */
export function formatTime(value: Date | string, locale: string): string {
  return formatter(locale, TIME_OPTIONS).format(new Date(value));
}

/**
 * «13 авг, 09:30» — дата на языке мастера, час 24-часовой.
 *
 * `dateOptions` задаёт только датную часть: экраны показывают её по-разному
 * (где-то без года, где-то с ним), а час везде один и тот же.
 */
export function formatDateTime(
  value: Date | string,
  locale: string,
  dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  return formatter(locale, { ...dateOptions, ...TIME_OPTIONS }).format(new Date(value));
}
