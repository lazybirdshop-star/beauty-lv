import { weekdayShort } from '@/lib/format';

import type { DaySlots, OpenWindow } from './types';

/** Дни расписания из уже склеенных окон (`openWindows`), не из моментов. */
export function groupSlotsByDay(slots: OpenWindow[], locale: string): DaySlots[] {
  const byDate = new Map<string, OpenWindow[]>();
  for (const slot of slots) {
    const forDate = byDate.get(slot.date) ?? [];
    forDate.push(slot);
    byDate.set(slot.date, forDate);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => {
      const sample = new Date(`${date}T00:00:00`);
      return {
        date,
        weekdayShort: weekdayShort(sample, locale),
        dayNumber: sample.getDate(),
        slots: [...daySlots].sort((a, b) => a.time.localeCompare(b.time)),
      };
    });
}
