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
 * Размеры приходят токенами с умолчанием публичных миров: `default` 48,
 * `sm` 44, `pill` 36, `icon` 44×44. Кабинет мастера ставит размеры
 * прототипа «Кабинет 2026» — 40, 34, 28 и 40 — и добирает зону касания до
 * 44 px невидимым псевдоэлементом (primitives.css), для чего кнопка и
 * называет себя атрибутами `data-slot`, `data-variant`, `data-size`.
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 control action-motion whitespace-nowrap text-[length:var(--action-size,15px)] [font-weight:var(--action-weight,600)] hover:translate-y-[var(--action-lift,0px)] hover:shadow-[var(--action-hover-shadow,none)] active:translate-y-[var(--action-press-y,1px)] active:scale-[var(--press-scale)] active:shadow-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:border disabled:border-transparent disabled:bg-bg-sunken disabled:text-[color:var(--action-disabled-fg,var(--ink-soft))] disabled:shadow-none disabled:hover:bg-bg-sunken disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
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
        default: 'h-[var(--action-h,3rem)] px-[var(--action-px,1.5rem)]',
        sm: 'h-[var(--action-h-sm,2.75rem)] px-[var(--action-px-sm,1rem)] text-[length:var(--action-size-sm,0.875rem)]',
        /* Пилюля внутри предмета; зона нажатия добирается псевдоэлементом,
           а не полями, — иначе пилюля переставала быть пилюлей. */
        pill: "relative h-[var(--action-h-pill,2.25rem)] px-[var(--action-px-pill,0.875rem)] text-[length:var(--action-size-pill,13px)] [font-weight:var(--action-weight,500)] after:absolute after:inset-x-0 after:-inset-y-[var(--action-pill-reach,0.25rem)] after:content-['']",
        icon: 'h-[var(--action-h-icon,2.75rem)] w-[var(--action-h-icon,2.75rem)] rounded-[var(--action-icon-radius,0.75rem)]',
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
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'primary'}
      data-size={size ?? 'default'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
