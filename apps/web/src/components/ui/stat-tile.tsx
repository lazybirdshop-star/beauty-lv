import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /**
   * Одна плитка в группе может вести — та, на которую мастер смотрит первой.
   * Ведёт она кеглем и воздухом, а не краской: розовый в системе не украшает,
   * он занят двумя ролями — заливкой кнопки записи и меткой занятого времени.
   */
  emphasis?: 'default' | 'lead';
  className?: string;
}

/**
 * Плитка числа: микро-лейбл прописными, само число дисплейным начертанием,
 * подпись третьим уровнем прозрачности. Ни рамки, ни тени — плитка отделена
 * от поля тоном поверхности.
 */
export function StatTile({ label, value, hint, emphasis = 'default', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'card flex flex-col gap-2',
        emphasis === 'lead' ? 'px-5 py-6' : 'px-4 py-5',
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      <span
        className={cn(
          'font-display leading-[0.88] tabular-nums text-ink',
          emphasis === 'lead'
            ? 'text-[clamp(2.25rem,6vw,3rem)]'
            : 'text-[clamp(1.75rem,5vw,2.25rem)]',
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-[13px] text-ink-faint">{hint}</span> : null}
    </div>
  );
}
