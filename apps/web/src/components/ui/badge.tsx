import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Статус в системе AMOLIE несёт цвет и положение, а не значок и не плашка.
 * Отсюда точка 7px и обычная подпись чернилами вместо цветного прямоугольника:
 * палитра остаётся «два цвета и один акцент», а сам статус читается и по
 * форме, и по слову, и по цвету — не цветом одним.
 *
 * Точка — графический объект, ей достаточно 3:1; подпись идёт вторым уровнем
 * прозрачности и держит 7.7:1 на светлом поле и 5.6:1 на тёмном.
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

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof dotVariants> {}

export function Badge({ className, tone, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap text-xs text-ink-soft',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn(dotVariants({ tone }))} />
      {children}
    </span>
  );
}
