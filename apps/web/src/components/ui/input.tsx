import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      /* The focus ring is the accent itself, offset off the field — the old
         `ring-accent-soft` was a blush ring on a white field (≈1.2:1), which
         fails WCAG 2.4.7 in the one place the master types all day. Radius
         comes from the world token, not a hard-coded step. */
      className={cn(
        'h-12 rounded-[var(--field-radius)] border border-border-strong bg-bg-raised px-3.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg',
        className,
      )}
      {...props}
    />
  );
}
