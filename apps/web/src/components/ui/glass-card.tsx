import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** `lifted` reads as the primary object on screen; `flat` sits quietly in a grid. */
  elevation?: 'flat' | 'lifted';
}

export function GlassCard({ className, elevation = 'flat', ...props }: GlassCardProps) {
  return (
    <div
      className={cn('glass rounded-3xl p-5', elevation === 'lifted' && 'shadow-lifted', className)}
      {...props}
    />
  );
}

export function GlassCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft',
        className,
      )}
      {...props}
    />
  );
}
