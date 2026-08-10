import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * A native `<select>`, deliberately — it inherits the platform's own picker,
 * which on a phone is a full-height wheel no custom listbox matches for
 * one-handed use, and it costs nothing in bundle size or accessibility work.
 * Styled to sit flush with `Input` so forms mixing the two stay even.
 */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 w-full cursor-pointer rounded-[var(--field-radius)] border border-border-strong bg-bg-raised px-3.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg',
        className,
      )}
      {...props}
    />
  );
}
