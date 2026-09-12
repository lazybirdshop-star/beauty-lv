import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

/**
 * Правило 02 Design System V2: любой предмет, который означает время, несёт
 * слева полосу 6 px во всю высоту, скруглённую, в цвете своей услуги.
 *
 * Ставится внутрь предмета с `position: relative`; цвет — тон услуги
 * (`serviceTone`), без тона — акцент. `inset` отступает от краёв на 6 px —
 * для строк, где полоса не должна касаться границ поверхности.
 */
export function ServiceBar({
  tone,
  inset,
  className,
}: {
  tone?: string | null;
  inset?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('service-bar', inset && 'service-bar--inset', className)}
      style={tone ? ({ '--tone': tone } as CSSProperties) : undefined}
    />
  );
}
