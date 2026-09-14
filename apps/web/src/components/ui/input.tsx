import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Поле — ниша, а не коробка с обводкой (Design System V2 §5).
 *
 * Высота, заливка, рамка и кегль приходят токенами: в кабинете это ниша
 * `--bg-inset` 44 px с прозрачной рамкой и 15 px (16 на телефоне — против
 * масштабирования iOS); публичные миры оставляют свою рамку и свой кегль.
 * Фокус кабинета — рамка акцентом, белый лист и мягкое кольцо
 * (`.field-control` в primitives.css): единственное место, где мастер
 * печатает весь день, обязано показывать фокус без догадок.
 */
export const fieldClassName =
  'field-control h-[var(--field-height,3rem)] rounded-[var(--field-radius)] border-[length:var(--field-border-width,1px)] border-[color:var(--field-border,var(--border-strong))] bg-[var(--field-bg,var(--bg-raised))] px-3.5 text-[length:var(--field-font,1rem)] text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}
