import type { DaySlots, PublishedSlot } from './types';

const WEEKDAY_SHORT_RU = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTH_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function groupSlotsByDay(slots: PublishedSlot[]): DaySlots[] {
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
        weekdayShort: WEEKDAY_SHORT_RU[sample.getDay()]!,
        dayNumber: sample.getDate(),
        monthShort: MONTH_SHORT_RU[sample.getMonth()]!,
        slots: [...daySlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
    });
}
