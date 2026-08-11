/**
 * Словарь классов мира Luxury («Bergs», грейж-разворот): плоская печать —
 * прямые углы, линейки вместо теней, бронза как единственный цвет действия.
 * Один источник на все слоты, чтобы кнопка записи на календаре, в прайсе и
 * в шторке была одной и той же кнопкой.
 */

/* Единственная заливка мира — бронзовая плита 54px: капс 11px с разрядкой
   0.2em сливками. Hover чуть высветляет бронзу за 300ms; press —
   `brightness(0.92)`, никогда scale (тайминги несёт `luxury-action`).
   Недоступная — контур тихой линейки без заливки. */
export const PRIMARY_BUTTON_CLASS =
  'action-fill luxury-action inline-flex h-[54px] cursor-pointer items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] hover:bg-[color-mix(in_srgb,var(--accent)_92%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:border disabled:border-border disabled:bg-transparent disabled:text-ink-faint';

/* Secondary — чернильный контур; hover уводит край и надпись в бронзу. */
export const SECONDARY_BUTTON_CLASS =
  'luxury-action inline-flex cursor-pointer items-center justify-center gap-2 border border-border-strong text-[11px] font-medium uppercase tracking-[var(--action-tracking)] text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50';

/* Служебная капс-подпись разворота: 10px с разрядкой 0.2em. */
export const CAPTION_CLASS = 'text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint';

/* Горизонтальные поля листа — 18px макета. */
export const PAGE_X = 'px-[18px]';
