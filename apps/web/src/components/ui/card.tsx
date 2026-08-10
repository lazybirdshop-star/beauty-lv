import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `lifted` reads as the primary object on screen; `flat` sits quietly in a grid. */
  elevation?: 'flat' | 'lifted';
}

/**
 * The one frosted card of the dashboard world — `.glass` carries background,
 * border and shadow (globals.css). `Card` and `GlassCard` used to be two
 * copies of this same surface with diverging title styles; one primitive,
 * one `elevation` prop, one heading step.
 */
export function Card({ className, elevation = 'flat', ...props }: CardProps) {
  return (
    <div
      className={cn('glass rounded-3xl p-5', elevation === 'lifted' && 'shadow-lifted', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...props} />
  );
}

/** The single card-heading step. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] font-semibold text-ink', className)} {...props} />;
}

/**
 * Uppercase label over data — a caption for numbers and lists («Последние
 * действия», «Ваша страница записи»), never a second heading style for the
 * same card. If the card introduces actions or a form, use `CardTitle`.
 */
export function CardLabel({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
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
