import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** One tile per group may be `accent` — the number the master looks at first. */
  tone?: 'default' | 'accent';
  className?: string;
}

export function StatTile({ label, value, hint, tone = 'default', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'glass flex flex-col gap-1 rounded-3xl px-4 py-4',
        tone === 'accent' && 'border-transparent bg-accent shadow-lifted',
        className,
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.09em]',
          tone === 'accent' ? 'text-accent-contrast/85' : 'text-ink-soft',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-display text-[32px] leading-none tabular-nums',
          tone === 'accent' ? 'text-accent-contrast' : 'text-ink',
        )}
      >
        {value}
      </span>
      {hint ? (
        <span
          className={cn('text-xs', tone === 'accent' ? 'text-accent-contrast/85' : 'text-ink-soft')}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
