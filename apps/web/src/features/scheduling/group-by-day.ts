import { monthShort, weekdayShort } from '@/lib/format';

import type { DaySlots, PublishedSlot } from './types';

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function groupSlotsByDay(slots: PublishedSlot[], locale: string): DaySlots[] {
  const byDate = new Map<string, PublishedSlot[]>();
  for (const slot of slots) {
    const key = dateKey(slot.startsAt);
    const forDate = byDate.get(key) ?? [];
    forDate.push(slot);
    byDate.set(key, forDate);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySlots]) => {
      const sample = new Date(daySlots[0]!.startsAt);
      return {
        dateKey: key,
        weekdayShort: weekdayShort(sample, locale),
        dayNumber: sample.getDate(),
        monthShort: monthShort(sample, locale),
        slots: [...daySlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
    });
}
