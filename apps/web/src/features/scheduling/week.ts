import { formatDayMonth, weekdayShort } from '@/lib/format';

import type { PublishedSlot } from './types';

export interface WeekDay {
  dateKey: string;
  date: Date;
  weekdayShort: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  slots: PublishedSlot[];
  availableCount: number;
  bookedCount: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Monday-first, matching how Russian and Latvian calendars are read. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Seven days starting from the Monday of `reference`'s week, each carrying
 * its own published windows — this is the "what does my week look like"
 * view the list of days alone never gave.
 */
export function buildWeek(reference: Date, slots: PublishedSlot[], locale: string): WeekDay[] {
  const monday = startOfWeek(reference);
  const todayKey = toDateKey(new Date());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const byDate = new Map<string, PublishedSlot[]>();
  for (const slot of slots) {
    const key = toDateKey(new Date(slot.startsAt));
    const list = byDate.get(key) ?? [];
    list.push(slot);
    byDate.set(key, list);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const dateKey = toDateKey(date);
    const daySlots = (byDate.get(dateKey) ?? []).sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    );

    return {
      dateKey,
      date,
      weekdayShort: weekdayShort(date, locale),
      dayNumber: date.getDate(),
      isToday: dateKey === todayKey,
      isPast: date < startOfToday,
      slots: daySlots,
      availableCount: daySlots.filter((slot) => slot.status === 'available').length,
      bookedCount: daySlots.filter((slot) => slot.status === 'booked').length,
    };
  });
}

export function formatWeekRange(days: WeekDay[], locale: string): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';
  return `${formatDayMonth(first.date, locale)} — ${formatDayMonth(last.date, locale)}`;
}

/**
 * Expands "these dates, 10:00–18:00, every 60 min" into concrete ISO
 * timestamps. The product deliberately has no working-hours template
 * (PRD.md §7.4) — this is still the master publishing explicit windows,
 * it just spares her from tapping each one.
 */
export function expandSlotTimes(
  dates: Date[],
  fromMinutes: number,
  toMinutes: number,
  stepMinutes: number,
): string[] {
  if (stepMinutes <= 0 || toMinutes <= fromMinutes) return [];

  const result: string[] = [];
  for (const date of dates) {
    for (let minutes = fromMinutes; minutes < toMinutes; minutes += stepMinutes) {
      const slot = new Date(date);
      slot.setHours(0, minutes, 0, 0);
      result.push(slot.toISOString());
    }
  }
  return result;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Every date from `from` to `to` inclusive; empty if the range is backwards. */
export function datesInRange(from: Date, to: Date): Date[] {
  const result: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end && result.length < 92) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
