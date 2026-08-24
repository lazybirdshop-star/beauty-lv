import {
  addDaysToKey,
  civilToInstant,
  keysInRange,
  mondayOfKey,
  noonOf,
  todayKey,
  weekdayIndex,
  type DateKey,
} from '@/lib/civil-date';
import { dayKey, formatDayMonth, weekdayShort } from '@/lib/format';

import type { PublishedSlot } from './types';

export interface WeekDay {
  dateKey: DateKey;
  /** Полдень этого дня в поясе организации — представитель суток для `Intl`. */
  date: Date;
  weekdayShort: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  slots: PublishedSlot[];
  availableCount: number;
  bookedCount: number;
}

export { addDaysToKey, keysInRange, mondayOfKey, todayKey, type DateKey };

/** Гражданская дата момента в поясе организации. */
export function toDateKey(value: Date | string, timeZone?: string): DateKey {
  return dayKey(value, timeZone);
}

/**
 * Seven days starting from the Monday of `reference`'s week, each carrying
 * its own published windows — this is the "what does my week look like"
 * view the list of days alone never gave.
 *
 * Неделя набирается гражданскими датами, а не объектами `Date`: сутки, в
 * которые попадает окно, принадлежат салону. Пока день считался локальными
 * `getDate()`, мастер в поездке видела своё расписание сдвинутым — окно,
 * опубликованное на утро, уезжало в соседнюю клетку.
 */
export function buildWeek(
  reference: DateKey,
  slots: PublishedSlot[],
  locale: string,
  timeZone?: string,
): WeekDay[] {
  const monday = mondayOfKey(reference);
  const today = todayKey(timeZone);

  const byDate = new Map<DateKey, PublishedSlot[]>();
  for (const slot of slots) {
    const key = toDateKey(slot.startsAt, timeZone);
    const list = byDate.get(key) ?? [];
    list.push(slot);
    byDate.set(key, list);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToKey(monday, index);
    const daySlots = (byDate.get(key) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    /* Полдень, а не полночь: в поясах, где стрелки переводят в полночь, её
       может не существовать, и день схлопнулся бы в предыдущий. */
    const date = noonOf(key, timeZone ?? 'UTC');

    return {
      dateKey: key,
      date,
      weekdayShort: weekdayShort(date, locale, timeZone),
      dayNumber: Number(key.slice(8, 10)),
      isToday: key === today,
      /* Сравниваются даты, а не моменты: «прошедший» — это про клетку
         календаря, и сегодняшнее утро прошедшим днём не является. */
      isPast: key < today,
      slots: daySlots,
      availableCount: daySlots.filter((slot) => slot.status === 'available').length,
      bookedCount: daySlots.filter((slot) => slot.status === 'booked').length,
    };
  });
}

/**
 * «24 — 30 августа», а не «24 августа — 30 августа».
 *
 * Полная запись требовала 163px там, где есть 114, и подпись обрезалась
 * многоточием на каждом телефоне: «August 24 — Augu…», «24 августа — 30 авг…».
 * Внутри одного месяца его имя названо один раз — так неделя и читается вслух,
 * и так она наконец помещается. Через границу месяца обе половины остаются
 * полными: «30 августа — 5 сентября» без второго месяца было бы неправдой.
 *
 * Год не пишется: неделя, которую листает мастер, всегда рядом с сегодня, а
 * лишнее слово — это ровно те пиксели, которых не хватало.
 */
export function formatWeekRange(days: WeekDay[], locale: string, timeZone?: string): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';

  const sameMonth = monthKey(first.date, timeZone) === monthKey(last.date, timeZone);
  const to = formatDayMonth(last.date, locale, timeZone);
  const from = sameMonth ? String(first.dayNumber) : formatDayMonth(first.date, locale, timeZone);

  return `${from} — ${to}`;
}

/** «2026-08» в поясе организации — тот же месяц или уже следующий. */
function monthKey(date: Date, timeZone?: string): string {
  return dayKey(date, timeZone).slice(0, 7);
}

/**
 * Expands "these dates, 10:00–18:00, every 60 min" into concrete ISO
 * timestamps. The product deliberately has no working-hours template
 * (PRD.md §7.4) — this is still the master publishing explicit windows,
 * it just spares her from tapping each one.
 *
 * «10:00» здесь — десять часов **в салоне**. Прежняя реализация собирала
 * момент через `setHours` на объекте `Date`, то есть в поясе устройства: та же
 * форма, заполненная из поездки, публиковала окна на другое реальное время, и
 * клиент видел на странице записи не то, что мастер открыла.
 */
export function expandSlotTimes(
  dates: DateKey[],
  fromMinutes: number,
  toMinutes: number,
  stepMinutes: number,
  timeZone: string,
): string[] {
  if (stepMinutes <= 0 || toMinutes <= fromMinutes) return [];

  const result: string[] = [];
  for (const key of dates) {
    for (let minutes = fromMinutes; minutes < toMinutes; minutes += stepMinutes) {
      result.push(civilToInstant(key, minutes, timeZone).toISOString());
    }
  }
  return result;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Индекс дня недели, 0 — понедельник: тем же порядком набран выбор дней. */
export { weekdayIndex };

/** Гражданские дата и время «HH:MM» в момент времени в поясе организации. */
export function civilDateTimeToIso(key: DateKey, time: string, timeZone: string): string {
  return civilToInstant(key, parseTimeToMinutes(time), timeZone).toISOString();
}

/** «10:00» — час окна в поясе организации, для заполнения поля времени. */
export function civilTimeValue(value: Date | string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}
