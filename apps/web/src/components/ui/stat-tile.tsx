import Link from 'next/link';
import type { ReactNode } from 'react';

import { cellFillClass, type CellFill } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
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
  /**
   * Раздел, в котором число раскрывается: «Клиенты 148» — это вход в книгу
   * клиентов, а не витрина. Плитка без адреса остаётся неинтерактивной —
   * ложная кликабельность хуже её отсутствия.
   */
  href?: string;
  /**
   * Ряд последних периодов от старого к новому. Одно число говорит «сколько»,
   * ряд — «куда идёт»; второй вопрос и есть причина открыть сводку.
   */
  trend?: number[];
  /** Что означает ряд, словами — для читалки; обязателен вместе с `trend`. */
  trendLabel?: string;
  /** Лесенка появления: от неё же отсчитывается рост столбиков. */
  delay?: number;
  /** Роль ячейки в бенто — см. `CellFill`. */
  fill?: CellFill;
  className?: string;
}

/**
 * Плитка числа: микро-лейбл прописными, само число дисплейным начертанием,
 * под ним — ряд последних периодов, подпись третьим уровнем прозрачности.
 * Ни рамки, ни тени — плитка отделена от поля тоном поверхности.
 */
export function StatTile({
  label,
  value,
  hint,
  emphasis = 'default',
  href,
  trend,
  trendLabel,
  delay = 0,
  fill,
  className,
}: StatTileProps) {
  const body = (
    <>
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
      {/* Ряд появляется после числа: сначала «сколько», потом «куда идёт». */}
      {trend && trendLabel ? (
        <Sparkline data={trend} label={trendLabel} delay={delay + 120} className="mt-0.5" />
      ) : null}
      {/* `mt-auto`: в сетке разного веса плитка растянута по высоте соседней
          ведущей ячейки, и подпись обязана стоять на её дне, а не оставлять
          под собой треть пустой карточки. В обычном ряду, где лишней высоты
          нет, правило ничего не меняет. */}
      {hint ? <span className="mt-auto text-[13px] text-ink-faint">{hint}</span> : null}
    </>
  );

  /*
   * Отступы одинаковые у всех плиток ряда.
   *
   * Ведущая получала `py-6` против `py-5` у обычной, и на «Финансах» «Доход»
   * и «Средний чек» стоят в одном ряду — их микро-лейблы не сходились по
   * базовой линии. Ведёт плитка кеглем числа, и этого достаточно:
   * разъезжающиеся подписи соседей — не акцент, а дефект.
   *
   * `@container`: число меряется по плитке, а не по окну — см. выше.
   */
  const shell = cn('card @container flex flex-col gap-2 px-5 py-6', cellFillClass(fill), className);

  if (!href) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        shell,
        'stat-tile-link overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
      )}
    >
      {body}
    </Link>
  );
}
