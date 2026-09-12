import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Статус — точка и слово, три канала: форма, слово, цвет. Никогда цвет один.
 *
 * Точка — графический объект, ей достаточно 3:1; слово идёт вторым уровнем
 * чернил. `variant="pill"` — мягкая подложка тона и слово в чернилах тона
 * (`--*-ink`, измерены) для шапки карточки визита (Design System V2 §7);
 * везде остальном плашки нет.
 */
const dotVariants = cva('h-[7px] w-[7px] shrink-0 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-ink-faint',
      accent: 'bg-accent',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const badgeVariants = cva('inline-flex items-center gap-2 whitespace-nowrap text-xs', {
  variants: {
    tone: {
      neutral: 'text-ink-soft',
      accent: 'text-ink-soft',
      success: 'text-ink-soft',
      warning: 'text-ink-soft',
      danger: 'text-ink-soft',
    },
    variant: {
      plain: '',
      pill: 'h-8 rounded-full px-3 font-medium',
    },
  },
  compoundVariants: [
    { variant: 'pill', tone: 'neutral', className: 'bg-bg-inset text-ink' },
    { variant: 'pill', tone: 'accent', className: 'bg-bg-free text-accent-ink' },
    { variant: 'pill', tone: 'success', className: 'bg-success-soft text-success-ink' },
    { variant: 'pill', tone: 'warning', className: 'bg-warning-soft text-warning-ink' },
    { variant: 'pill', tone: 'danger', className: 'bg-danger-soft text-danger-ink' },
  ],
  defaultVariants: { tone: 'neutral', variant: 'plain' },
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant }), className)} {...props}>
      <span aria-hidden="true" className={cn(dotVariants({ tone }))} />
      {children}
    </span>
  );
}
