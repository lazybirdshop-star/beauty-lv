import type { CSSProperties, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Лесенка задержек для роста величин (`bar-grow`, `line-draw`).
 *
 * Появление блоков по закону прежней системы (900ms, подъём, размытие)
 * из кабинета ушло вместе с классом `.rise`: Design System V2 знает движение
 * только для смены состояния (handoff §3.7, M5). `Rise` остаётся обёрткой без
 * анимации, пока последние экраны не снимут класс.
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
