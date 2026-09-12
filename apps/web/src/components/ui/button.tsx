import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Одна семья кнопок на кабинет и публичные миры.
 *
 * Всё, что различается между мирами, выражено токенами с умолчанием, равным
 * прежнему поведению продукта: форма (`--control-radius`), кегль
 * (`--action-size`), подъём под курсором (`--action-lift` / `--action-hover-shadow`),
 * заливки наведения. В кабинете (Design System V2) наведение — не цвет, а
 * подъём тенью; нажатие возвращает подъём к нулю и не уменьшает элемент.
 *
 * Варианты кабинета (handoff §4): `primary` — единственное действие, которое
 * совершает запись; `secondary` — контур на белом; `raised` — белая пилюля с
 * тенью для панелей инструментов; `soft` — розовая ниша («Позвонить»);
 * `success` — «Завершён»; `flat` — плоская пилюля на столе; `ghost` —
 * третичное; `danger` — только слова, `danger-solid` — заливка листа
 * подтверждения.
 *
 * Размеры: `default` 48 (футер панели), `sm` 44 (строки, панель
 * инструментов), `pill` 36 внутри предметов с зоной нажатия 44 через
 * псевдоэлемент, `icon` 44×44.
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 control action-motion whitespace-nowrap text-[length:var(--action-size,15px)] font-semibold hover:translate-y-[var(--action-lift,0px)] hover:shadow-[var(--action-hover-shadow,none)] active:translate-y-[var(--action-press-y,1px)] active:scale-[var(--press-scale)] active:shadow-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:border disabled:border-transparent disabled:bg-bg-sunken disabled:text-[color:var(--action-disabled-fg,var(--ink-soft))] disabled:shadow-none disabled:hover:bg-bg-sunken disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-contrast hover:bg-accent-hover active:bg-[color:var(--accent-active,var(--accent-hover))]',
        secondary:
          'border border-border-strong bg-[var(--action-secondary-bg,transparent)] text-ink hover:border-[color:var(--action-edge-hover,var(--border-strong))] hover:bg-[var(--action-secondary-hover,var(--bg-sunken))]',
        raised: 'bg-bg-raised text-ink shadow-control',
        ghost:
          'text-[color:var(--action-ghost-fg,var(--accent))] hover:bg-[var(--action-ghost-hover,var(--accent-soft))] disabled:hover:bg-bg-sunken',
        soft: 'bg-bg-free text-accent-ink',
        success: 'bg-success-fill text-success-contrast',
        flat: 'bg-bg text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink',
        danger: 'text-danger hover:bg-danger-soft',
        'danger-solid': 'bg-danger text-danger-contrast hover:brightness-95',
      },
      size: {
        default: 'h-12 px-[var(--action-px,1.5rem)]',
        // 44px, not 40: `sm` is the size the dashboard actually reaches for —
        // row actions, the share block, "new booking" — and at 40 it was the
        // most-used control in the product sitting under the touch floor.
        sm: 'h-11 px-[var(--action-px-sm,1rem)] text-sm',
        /* 36 px внутри предмета; зона нажатия 44 добирается псевдоэлементом,
           а не полями, — иначе пилюля переставала быть пилюлей. */
        pill: "relative h-9 px-3.5 text-[13px] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
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
