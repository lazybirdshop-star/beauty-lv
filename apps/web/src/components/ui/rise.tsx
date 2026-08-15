import type { CSSProperties, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Появление по закону системы: 900ms, подъём на 28px, размытие 14px → 0,
 * одна кривая `cubic-bezier(.22, 1, .36, 1)`. Сама анимация живёт в
 * `globals.css` (класс `.rise`) — здесь только лесенка задержек.
 *
 * Приём взят у `AnimatedContent` с reactbits.dev, но собран на CSS вместо
 * GSAP: экраны кабинета — серверные компоненты, и появление не должно стоить
 * им ни клиентского бандла, ни гидратации. `prefers-reduced-motion`
 * обнуляет анимацию там же, в CSS.
 */

/** Шаг между однородными элементами списка. */
export const RISE_ITEM = 50;
/** Шаг между смысловыми группами экрана. */
export const RISE_GROUP = 100;

/** Задержка лесенки как inline-переменная — для элементов, которым `Rise` не нужен. */
export function riseDelay(ms: number): CSSProperties {
  return { '--rise-delay': `${ms}ms` } as CSSProperties;
}

interface RiseProps extends HTMLAttributes<HTMLDivElement> {
  /** Миллисекунды лесенки: `RISE_ITEM` внутри группы, `RISE_GROUP` между ними. */
  delay?: number;
}

export function Rise({ delay = 0, className, style, ...props }: RiseProps) {
  return (
    <div className={cn('rise', className)} style={{ ...riseDelay(delay), ...style }} {...props} />
  );
}
