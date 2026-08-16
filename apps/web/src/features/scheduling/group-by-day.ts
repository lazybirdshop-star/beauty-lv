import { noonOf } from '@/lib/civil-date';
import { dayKey, monthShort, weekdayShort } from '@/lib/format';

import type { DaySlots, PublishedSlot } from './types';

/**
 * Сутки окна принадлежат салону. Прежняя реализация резала ISO-строку по
 * десятому символу — то есть группировала по UTC, — а подписывала клетку
 * локальными `getDate()`: два разных календаря в одном списке.
 */
export function groupSlotsByDay(
  slots: PublishedSlot[],
  locale: string,
  timeZone?: string,
): DaySlots[] {
  const byDate = new Map<string, PublishedSlot[]>();
  for (const slot of slots) {
    const key = dayKey(slot.startsAt, timeZone);
    const forDate = byDate.get(key) ?? [];
    forDate.push(slot);
    byDate.set(key, forDate);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySlots]) => {
      const sample = noonOf(key, timeZone ?? 'UTC');
      return {
        dateKey: key,
        weekdayShort: weekdayShort(sample, locale, timeZone),
        dayNumber: Number(key.slice(8, 10)),
        monthShort: monthShort(sample, locale, timeZone),
        slots: [...daySlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
    });
}
