import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * В системе AMOLIE у продукта два типа кнопок: залитая пилюля — единственное
 * действие, которое совершает запись, и пилюля волосяным контуром — всё
 * остальное. У залитой кнопки рамки нет никогда (CTA-02).
 *
 * Наведение не меняет цвет само по себе: кнопка поднимается, у контурной
 * светлеет граница (CTA-05). Подъём и провал нажатия выражены токенами
 * `--action-lift` / `--action-press-y`, поэтому миры публичной страницы, у
 * которых своя моторика, остаются нетронутыми — у них оба токена в
 * умолчаниях. Нажатие в кабинете не уменьшает элемент: `--press-scale` там 1,
 * а подъём просто возвращается к нулю — палец «дожал» кнопку до поверхности.
 */
/*
 * Всё, что различается между кабинетом и мирами публичной страницы, выражено
 * токенами с умолчанием, равным прежнему поведению продукта: правка облика
 * кабинета не имеет права переехать на страницу мастера — это разные
 * поверхности с разными владельцами.
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 control action-motion whitespace-nowrap text-[15px] font-semibold hover:translate-y-[var(--action-lift,0px)] active:translate-y-[var(--action-press-y,1px)] active:scale-[var(--press-scale)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:border disabled:border-transparent disabled:bg-bg-sunken disabled:text-ink-soft disabled:shadow-none disabled:hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-contrast hover:bg-accent-hover',
        secondary:
          'border border-border-strong text-ink hover:border-[color:var(--action-edge-hover,var(--border-strong))] hover:bg-bg-sunken',
        /* Третичное действие. В кабинете `--action-ghost-fg` уводит его в
           чернила: #E2568A на белом даёт 3.54:1 и провалил бы AA. */
        ghost:
          'text-[color:var(--action-ghost-fg,var(--accent))] hover:bg-accent-soft disabled:hover:bg-bg-sunken',
        danger: 'bg-danger text-danger-contrast hover:brightness-95',
      },
      size: {
        default: 'h-12 px-[var(--action-px,1.5rem)]',
        // 44px, not 40: `sm` is the size the dashboard actually reaches for —
        // row actions, the share block, "new booking" — and at 40 it was the
        // most-used control in the product sitting under the touch floor.
        sm: 'h-11 px-[var(--action-px-sm,1rem)] text-sm',
        icon: 'h-11 w-11 rounded-[var(--action-icon-radius,0.75rem)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
