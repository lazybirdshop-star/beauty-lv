import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Статус — точка и слово на подложке тона, три канала: форма, слово, цвет.
 * Никогда цвет один.
 *
 * Пилюля прототипа «Кабинет 2026» (`.status`): 24 px, мягкая подложка тона
 * и слово в чернилах тона (`--*-ink`, измерены в tokens.test.ts).
 * `variant="pill"` — та же пилюля крупнее, 32 px, для шапки карточки визита.
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

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-bg-inset text-ink-soft',
        accent: 'bg-bg-free text-accent-ink',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        danger: 'bg-danger-soft text-danger-ink',
      },
      variant: {
        plain: 'h-6 gap-1.5 pl-[7px] pr-[9px]',
        pill: 'h-8 gap-2 px-3',
      },
    },
    defaultVariants: { tone: 'neutral', variant: 'plain' },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant }), className)} {...props}>
      <span aria-hidden="true" className={cn(dotVariants({ tone }))} />
      {children}
    </span>
  );
}
