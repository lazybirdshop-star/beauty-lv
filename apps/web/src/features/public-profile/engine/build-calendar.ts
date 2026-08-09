import { mondayFirstWeekdays } from '@/lib/format';

import type { DaySlots } from './types';

/**
 * Weekday header of the booking calendar, in the page's own language
 * (DESIGN_AUDIT.md P1-5): a Latvian page no longer opens with «Пн Вт Ср…».
 * Monday-first, matching how Russian and Latvian calendars are read; the
 * names themselves come from `Intl.DateTimeFormat(locale, { weekday: 'short' })`
 * via `mondayFirstWeekdays`, so no locale table lives here to go stale.
 */
export function weekdayHeaders(locale: string): string[] {
  return mondayFirstWeekdays(locale);
}

export interface CalendarCell {
  date: string;
  dayNumber: number;
  /** False for the leading/trailing days that belong to a neighbouring month. */
  inMonth: boolean;
  /** Null when the master published nothing that day — the cell is inert, not bookable. */
  day: DaySlots | null;
  availableCount: number;
}

export interface CalendarWeek {
  key: string;
  cells: CalendarCell[];
}

export interface CalendarMonth {
  year: number;
  /** 0-based, like `Date#getMonth`. */
  month: number;
  weeks: CalendarWeek[];
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * One calendar month, laid out Monday-first.
 *
 * Deliberately a fixed month rather than "however many weeks the published
 * slots happen to span": that range grew to six rows as soon as a master
 * published something a month out, which is a wall of mostly-empty cells.
 * A month is a unit people already navigate, so paging is obvious.
 */
export function buildMonth(year: number, month: number, days: DaySlots[]): CalendarMonth {
  const byDate = new Map(days.map((day) => [day.date, day]));

  const firstOfMonth = new Date(year, month, 1);
  const cursor = new Date(firstOfMonth);
  cursor.setDate(cursor.getDate() - mondayIndex(firstOfMonth));

  const lastOfMonth = new Date(year, month + 1, 0);
  const weeks: CalendarWeek[] = [];

  while (cursor <= lastOfMonth || weeks.length === 0) {
    const cells: CalendarCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = toDateKey(cursor);
      const day = byDate.get(date) ?? null;
      cells.push({
        date,
        dayNumber: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        day,
        availableCount: day ? day.slots.filter((slot) => slot.status === 'available').length : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ key: cells[0]!.date, cells });
    if (weeks.length >= 6) break;
  }

  return { year, month, weeks };
}

/** Months that actually contain published windows — used to hint where to page to. */
export function monthsWithSlots(days: DaySlots[]): Set<string> {
  return new Set(days.map((day) => day.date.slice(0, 7)));
}
