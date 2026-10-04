import { type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { CalendarCell } from './build-calendar';
import type { OpenWindow } from './types';

/**
 * Spoken labels of the schedule page, built once for every world
 * (BRAND_STYLE_ARCHITECTURE.md §7.5). Free markup must not mean seven
 * dialects of accessibility: the words a screen reader says come from these
 * builders, so the verbal part cannot drift between compositions.
 *
 * The composition checklist the worlds are reviewed against:
 * - a visible focus ring on every interactive cell (`focus-visible`);
 * - a hit area of at least 44px (the pseudo-element lift counts);
 * - `aria-pressed` on toggle cells (days, slots, service rows);
 * - `role="alert"` on submission errors;
 * - decorative progress and marks stay `aria-hidden`.
 */

/**
 * A day cell announces its number and what it offers: the free-window count
 * when it has any, "all booked" when the master opened the day but it filled
 * up. Inert cells (nothing published) are `aria-hidden` in the markup and
 * never reach this builder.
 */
export function dayAriaLabel(cell: CalendarCell, t: Messages): string {
  return `${cell.dayNumber} — ${
    cell.availableCount > 0
      ? fmt(t.publicPage.slotsFree, { count: cell.availableCount })
      : t.publicPage.allBooked
  }`;
}

/**
 * Окно называет себя целиком — «10:00–11:00», — потому что плитка показывает
 * начало и длину двумя строками, а голосом это читается как одно время.
 * Занятое говорит об этом словами: перечёркнутость до экранного читателя не
 * доходит.
 */
export function slotAriaLabel(slot: OpenWindow, t: Messages): string {
  const span = `${slot.time}–${slot.endTime}`;
  return slot.status === 'booked' ? `${span} — ${t.publicPage.allBooked}` : span;
}
