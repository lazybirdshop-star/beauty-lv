import type { DaySlots } from './types';

/** Monday-first, matching how Russian and Latvian calendars are read. */
export const WEEKDAY_HEADERS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export interface CalendarCell {
  date: string;
  dayNumber: number;
  /** Null when the master published nothing that day — the cell is inert, not bookable. */
  day: DaySlots | null;
  availableCount: number;
}

export interface CalendarWeek {
  key: string;
  cells: CalendarCell[];
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

/**
 * Lays the published days out on a real month-style grid instead of a
 * single scrolling strip. The range is derived from what the master
 * actually published (first → last day, padded out to whole weeks) rather
 * than a fixed month, so the grid never shows a wall of empty cells — and
 * it is capped at `maxWeeks` so one far-future slot can't render a year.
 */
export function buildCalendar(days: DaySlots[], maxWeeks = 6): CalendarWeek[] {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return [];

  const cursor = new Date(`${first.date}T00:00:00`);
  cursor.setDate(cursor.getDate() - mondayIndex(cursor));

  const end = new Date(`${last.date}T00:00:00`);
  end.setDate(end.getDate() + (6 - mondayIndex(end)));

  const byDate = new Map(days.map((day) => [day.date, day]));
  const weeks: CalendarWeek[] = [];

  while (cursor <= end && weeks.length < maxWeeks) {
    const cells: CalendarCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = toDateKey(cursor);
      const day = byDate.get(date) ?? null;
      cells.push({
        date,
        dayNumber: cursor.getDate(),
        day,
        availableCount: day ? day.slots.filter((slot) => slot.status === 'available').length : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ key: cells[0]!.date, cells });
  }

  return weeks;
}
