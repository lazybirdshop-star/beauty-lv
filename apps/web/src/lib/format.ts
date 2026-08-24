import { formatMoney, type Money } from '@amolie/shared-kernel';

/**
 * «95,00 €» — сумма на языке того, кто её читает.
 *
 * Язык обязателен, и это главное в подписи. Он был зашит русским, и на
 * английской главной кабинета две суммы стояли рядом в разной записи: список
 * записей отдавал «95,00 €» отсюда, а плитка дохода — «€463.00» из `CountUp`,
 * который брал локаль честно. Умолчания здесь нет намеренно: пропущенный
 * аргумент — ровно тот способ, которым дефект и появился, и теперь его ловит
 * сборка.
 *
 * Валюта тоже не имеет умолчания по той же причине: сумма без валюты — не
 * сумма, а число, и «EUR по умолчанию» однажды подпишет евро чужие деньги.
 */
export function formatPrice(amountMinorUnits: number, currency: string, locale: string): string {
  return formatMoney({ amountMinorUnits, currency } satisfies Money, locale);
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
export function weekdayShort(date: Date, locale: string, timeZone?: string): string {
  return formatter(locale, timeZone ? { weekday: 'short', timeZone } : { weekday: 'short' })
    .format(date)
    .replace(/\.$/, '')
    .toUpperCase();
}

/** «янв» / «janv» / «Jan» — kept in the locale's own casing. */
export function monthShort(date: Date, locale: string, timeZone?: string): string {
  return formatter(locale, timeZone ? { month: 'short', timeZone } : { month: 'short' })
    .format(date)
    .replace(/\.$/, '');
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

export function formatDayMonth(date: Date, locale: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  return formatter(locale, timeZone ? { ...options, timeZone } : options).format(date);
}

/**
 * «13 авг 2026» — дата с годом, без часа.
 *
 * Отличается от `formatDayMonth` ровно годом, и год здесь обязателен: она
 * подписывает события, которые могли случиться в прошлом сезоне — регистрацию
 * мастера, выпуск заявки, — а «13 авг» без года в таком списке врёт.
 */
export function formatDate(value: Date | string, locale: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return formatter(locale, timeZone ? { ...options, timeZone } : options).format(new Date(value));
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

/**
 * «09:30» — час и минута, 24-часовые в любой локали.
 *
 * `timeZone` — пояс, в котором час имеет смысл. Запись назначена на 10:00 **в
 * салоне**, а не на устройстве мастера: без явного пояса тот же момент
 * подписывался бы по-разному на сервере (UTC) и в телефоне, и разметка,
 * пришедшая с сервера, расходилась бы с первой же гидратацией. Без аргумента
 * поведение прежнее — пояс среды.
 */
export function formatTime(value: Date | string, locale: string, timeZone?: string): string {
  return formatter(locale, timeZone ? { ...TIME_OPTIONS, timeZone } : TIME_OPTIONS).format(
    new Date(value),
  );
}

/**
 * Календарный день момента в заданном поясе — «2026-08-16».
 *
 * Собирается из частей, а не из `toLocaleDateString('en-CA')`: порядок и
 * разделители en-CA — свойство локали, а не контракт, и ключ дня не должен
 * зависеть от версии ICU в среде.
 */
const DAY_KEY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

export function dayKey(value: Date | string, timeZone?: string): string {
  const parts = formatter('en-GB', timeZone ? { ...DAY_KEY_OPTIONS, timeZone } : DAY_KEY_OPTIONS)
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Один ли это календарный день в поясе организации. */
export function isSameDay(a: Date | string, b: Date | string, timeZone?: string): boolean {
  return dayKey(a, timeZone) === dayKey(b, timeZone);
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
  timeZone?: string,
): string {
  return formatter(
    locale,
    timeZone ? { ...dateOptions, ...TIME_OPTIONS, timeZone } : { ...dateOptions, ...TIME_OPTIONS },
  ).format(new Date(value));
}
