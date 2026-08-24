import { type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { CalendarCell } from './build-calendar';
import type { PublishedSlot } from './types';

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
 * A slot chip announces its time; a booked one says so, since the line-through
 * that carries "taken" visually does not reach a screen reader.
 */
export function slotAriaLabel(slot: PublishedSlot, t: Messages): string {
  return slot.status === 'booked' ? `${slot.time} — ${t.publicPage.allBooked}` : slot.time;
}
