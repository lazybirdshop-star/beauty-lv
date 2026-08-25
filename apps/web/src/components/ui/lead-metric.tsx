import type { ReactNode } from 'react';

import { cellFillClass, type CellFill } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LeadMetricProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** График, ради которого ячейка и крупная: ряд целиком, а не намёк на него. */
  chart: ReactNode;
  /** Роль ячейки в бенто — см. `CellFill`. */
  fill?: CellFill;
  className?: string;
}

/**
 * Ведущая ячейка сводки: число во весь рост и под ним развёрнутый ряд.
 *
 * Отличается от `StatTile` не оформлением, а весом. Ряд одинаковых плиток
 * отвечает на шесть вопросов одинаково громко, и экран читается выгрузкой;
 * ведущая ячейка говорит, с чего смотреть, — и делает это размером, а не
 * краской и не рамкой, как того требует система.
 *
 * Ссылкой не становится намеренно: внутри живёт график со своими наведениями,
 * и обёртка в `<a>` сделала бы всю ячейку одним нажатием поверх них.
 */
export function LeadMetric({ label, value, hint, chart, fill, className }: LeadMetricProps) {
  return (
    /* `@container`: кегль числа меряется по самой ячейке — она вдвое шире
       соседних плиток, и мерка окна дала бы здесь другой результат. */
    <div
      className={cn(
        'card @container flex flex-col gap-2 px-5 py-6',
        cellFillClass(fill),
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      <span className="font-display text-[clamp(2.25rem,9cqi,4rem)] leading-[0.88] tabular-nums text-ink">
        {value}
      </span>
      {hint ? <span className="text-[13px] text-ink-faint">{hint}</span> : null}
      {/* `mt-auto`: в bento-сетке ячейка растянута по высоте соседей, и график
          обязан стоять на её дне, а не висеть под числом с пустотой снизу. */}
      <div className="mt-auto pt-6">{chart}</div>
    </div>
  );
}
