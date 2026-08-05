'use client';

import { cn } from '@/lib/utils';

/**
 * A count on a nav item, not a bare dot: the master needs to know whether one
 * client is waiting or six before deciding to open the section. Colour alone
 * would say «something is here» — the number says what and how much, and the
 * visually hidden sentence says it in words for a screen reader.
 *
 * Capped at 9+ so a busy morning cannot stretch the pill past the icon it
 * belongs to.
 */
export function NavBadge({
  count,
  label,
  className,
}: {
  count: number;
  /** Full sentence for assistive tech, e.g. «Записей, ждущих подтверждения: 3». */
  label: string;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
        'bg-accent text-[11px] font-semibold leading-none tabular-nums text-accent-contrast',
        className,
      )}
    >
      <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
