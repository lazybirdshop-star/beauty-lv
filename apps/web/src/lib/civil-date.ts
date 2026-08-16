import { dayKey } from './format';

/**
 * Гражданский календарь организации.
 *
 * Клетка календаря — это **дата**, а не момент времени: «16 августа» у мастера
 * в Риге и «16 августа» на сервере в UTC — одна и та же клетка, хотя моменты
 * её начала и конца разные. Пока сутки считались объектом `Date` с локальными
 * `setHours/getDate`, календарь неизбежно говорил поясом устройства: у мастера
 * дома это совпадало с поясом салона случайно, а в поездке разъезжалось.
 *
 * Поэтому день здесь — строка `YYYY-MM-DD`, арифметика идёт по UTC (в нём нет
 * перевода часов, и «плюс сутки» всегда ровно сутки), а в моменты времени
 * гражданская дата превращается только на границе — при публикации окна и при
 * отрисовке.
 */
export type DateKey = string;

/**
 * Пояс по умолчанию — та же строка, что стоит умолчанием у колонки
 * `organizations.timezone`. Живёт здесь, а не рядом с `requireOrganization`:
 * тот модуль читает куки и ходит в API, и один импорт константы затащил бы
 * серверный код в клиентский бандл.
 */
export const FALLBACK_TIMEZONE = 'Europe/Riga';

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function keyParts(key: DateKey): [number, number, number] {
  const match = KEY_PATTERN.exec(key);
  if (!match) return [NaN, NaN, NaN];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isDateKey(value: string): boolean {
  const [year, month, day] = keyParts(value);
  return Number.isFinite(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function keyFromUtc(date: Date): DateKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Полночь гражданской даты, разложенная в UTC — рабочая ось для арифметики. */
function utcMidnight(key: DateKey): Date {
  const [year, month, day] = keyParts(key);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Смещение пояса в миллисекундах в заданный момент.
 *
 * Считается так: время показывается в поясе, а показанные «часы на стене»
 * читаются обратно как если бы они были UTC. Разница между этим и самим
 * моментом и есть смещение — включая получасовые пояса и переведённые стрелки.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(instant)
    .reduce<Record<string, number>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = Number(part.value);
      return acc;
    }, {});

  const asIfUtc = Date.UTC(
    parts.year!,
    parts.month! - 1,
    parts.day!,
    parts.hour!,
    parts.minute!,
    parts.second!,
  );
  return asIfUtc - instant.getTime();
}

/**
 * Гражданские дата и минуты от полуночи в поясе — в момент времени.
 *
 * Два прохода, потому что задача рекурсивна: смещение зависит от момента, а
 * момент — от смещения. Первый проход даёт приближение, второй уточняет его
 * уже правильным смещением; этого достаточно везде, кроме самого часа перевода
 * стрелок, где такого гражданского времени либо не существует, либо оно
 * случается дважды, и любой ответ — соглашение.
 */
export function civilToInstant(key: DateKey, minutes: number, timeZone: string): Date {
  const wall = utcMidnight(key).getTime() + minutes * 60_000;
  const firstPass = wall - zoneOffsetMs(new Date(wall), timeZone);
  return new Date(wall - zoneOffsetMs(new Date(firstPass), timeZone));
}

/**
 * Полдень гражданского дня — безопасный представитель суток.
 *
 * Полночь для этого не годится: в поясах, где стрелки переводят именно в
 * полночь, её может не существовать, и день «схлопывается» в предыдущий.
 */
export function noonOf(key: DateKey, timeZone: string): Date {
  return civilToInstant(key, 12 * 60, timeZone);
}

/** Сегодняшняя дата в поясе организации. */
export function todayKey(timeZone?: string): DateKey {
  return dayKey(new Date(), timeZone);
}

/** Сдвиг на сутки по гражданскому календарю — ровно сутки, без перевода часов. */
export function addDaysToKey(key: DateKey, days: number): DateKey {
  const base = utcMidnight(key);
  base.setUTCDate(base.getUTCDate() + days);
  return keyFromUtc(base);
}

/** 0 — понедельник: так читают календарь по-русски и по-латышски. */
export function weekdayIndex(key: DateKey): number {
  return (utcMidnight(key).getUTCDay() + 6) % 7;
}

/** Понедельник недели, в которую попадает дата. */
export function mondayOfKey(key: DateKey): DateKey {
  return addDaysToKey(key, -weekdayIndex(key));
}

/**
 * Все даты от `from` до `to` включительно; пусто, если промежуток вывернут.
 * Потолок — тот же, что был у прежней реализации: массовая публикация не
 * должна уметь родить бесконечный список одним промахом в поле даты.
 */
export function keysInRange(from: DateKey, to: DateKey, max = 92): DateKey[] {
  if (!isDateKey(from) || !isDateKey(to) || from > to) return [];
  const result: DateKey[] = [];
  let cursor = from;
  while (cursor <= to && result.length < max) {
    result.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return result;
}
