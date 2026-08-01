import type { DaySlots, PublishedSlot } from './types';

const WEEKDAY_SHORT_RU = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

export function groupSlotsByDay(slots: PublishedSlot[]): DaySlots[] {
  const byDate = new Map<string, PublishedSlot[]>();
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
        weekdayShort: WEEKDAY_SHORT_RU[sample.getDay()]!,
        dayNumber: sample.getDate(),
        slots: [...daySlots].sort((a, b) => a.time.localeCompare(b.time)),
      };
    });
}
