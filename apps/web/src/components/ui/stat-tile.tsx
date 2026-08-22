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
      /* `@container`: число меряется по плитке, а не по окну — см. ниже. */
      className={cn(
        'card @container flex flex-col gap-2',
        emphasis === 'lead' ? 'px-5 py-6' : 'px-4 py-5',
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      {/*
        Кегль считается от ширины плитки, а не от ширины окна.
        
        Было `clamp(2.25rem, 6vw, 3rem)`, и обе ошибки в одной строке: `vw`
        меряет окно, тогда как плитка занимает его половину, а нижняя граница
        в 2.25rem не пускала число ужаться. На телефоне 6vw = 23px проигрывало
        полу, кегль вставал на 36px, и «463,00 €» требовало 154px в плитке
        шириной 129 — число вылезало за собственную карточку. `cqi` — процент
        ширины самой плитки, то есть ровно того, во что число обязано влезть.
      */}
      <span
        className={cn(
          'font-display leading-[0.88] tabular-nums text-ink',
          emphasis === 'lead'
            ? 'text-[clamp(1.5rem,16cqi,3rem)]'
            : 'text-[clamp(1.25rem,14cqi,2.25rem)]',
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-[13px] text-ink-faint">{hint}</span> : null}
    </div>
  );
}
