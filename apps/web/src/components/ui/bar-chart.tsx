import { riseDelay } from '@/components/ui/rise';
import { cn } from '@/lib/utils';

export interface BarChartPoint {
  /** Short axis label, e.g. `авг` or `21.07`. */
  label: string;
  value: number;
  /** Full label for the tooltip and the accessible table. */
  title: string;
}

interface BarChartProps {
  data: BarChartPoint[];
  formatValue: (value: number) => string;
  /** Names the single series — per dataviz guidance a one-series chart needs no legend. */
  caption: string;
  /** Localized empty-state line — the chart itself has no dictionary access. */
  emptyLabel: string;
  className?: string;
}

const CHART_HEIGHT_PX = 132;
const MIN_BAR_PX = 3;
/** До скольких точек столбикам задаётся предельная ширина. */
const SPACIOUS_UP_TO = 6;
/** Ширина, на которой один столбик читается столбиком, а не заливкой. */
const MAX_BAR_WIDTH_PX = 56;

/**
 * Single-series bars. Deliberately not a generic charting library: one
 * series of at most a dozen values needs no scales engine, and every
 * charting dependency would either phone home for fonts or fight the
 * token palette.
 *
 * Colour is the accent token — with one series there is no categorical
 * palette to validate for colour-blind separation, and identity is carried
 * by the caption rather than by hue.
 */
export function BarChart({ data, formatValue, caption, emptyLabel, className }: BarChartProps) {
  const max = Math.max(...data.map((point) => point.value), 0);

  if (data.length === 0 || max === 0) {
    return (
      <div className={cn('rounded-2xl bg-bg-sunken/70 px-4 py-10 text-center', className)}>
        <p className="text-sm text-ink-soft">{emptyLabel}</p>
      </div>
    );
  }

  /*
   * Столбик не растягивается на всю карточку.
   *
   * `flex: 1` при единственной точке отдавал ему всю ширину, а пик — всю
   * высоту: «Доход по месяцам» у нового кабинета читался как залитый акцентом
   * прямоугольник, а не как график. Это состояние по умолчанию для каждого,
   * кто работает первый месяц.
   *
   * Ряд выравнивается по левому краю, а столбик получает предельную ширину:
   * один месяц выглядит одним месяцем, а с шестой точки ограничение перестаёт
   * действовать само — `flex-1` уже даёт меньше предела.
   */
  const spacious = data.length < SPACIOUS_UP_TO;

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn('flex items-end gap-[2px]', spacious && 'justify-start')}
        style={{ height: CHART_HEIGHT_PX }}
        role="presentation"
      >
        {data.map((point, index) => {
          const height =
            point.value > 0 ? Math.max((point.value / max) * CHART_HEIGHT_PX, MIN_BAR_PX) : 0;
          /* Выделяется последний период, а не рекордный.
             `point.value === max` красил рекорд — а у ряда, который читают
             ради вопроса «как сейчас», рекорд может стоять в середине и
             читаться как сбой; при равных значениях он вдобавок красил
             несколько столбиков разом. Последний столбик — это «сейчас», тем
             же приёмом, что и точка на микро-графике плитки. */
          const isCurrent = index === data.length - 1;
          return (
            /* Not focusable: a dozen tab stops with no action behind them is
               noise for a keyboard user — the sr-only table below is the real
               AT path, the tooltip is a pointer affordance. */
            <div
              key={point.label + point.title}
              className="group relative flex flex-1 cursor-default flex-col justify-end rounded-t-[4px]"
              style={spacious ? { maxWidth: MAX_BAR_WIDTH_PX } : undefined}
            >
              {/* Столбик вырастает снизу лесенкой — тем же движением, каким
                  на экран приходит всё остальное. Раньше здесь стоял
                  `transition-[height]`, который на появлении не срабатывает
                  никогда: переход нужен смене значения, а не первому кадру. */}
              <span
                className={cn(
                  'bar-grow w-full rounded-t-[4px]',
                  /*
                   * Ряд идёт приглушённым акцентом, «сейчас» — чистым.
                   *
                   * Прозрачностью здесь не обойтись: #E2568A на белом даёт
                   * 3.54:1, а на 65% — 2.26:1, то есть ряд, каким он жил до
                   * сих пор, проваливал даже нетекстовый порог 3:1.
                   * `--accent-muted` — тот же акцент, уведённый в чернила
                   * (4.99:1 в светлой теме, 3.49:1 в тёмной), и он же делает
                   * иерархию читаемой: прошедшее глубже, сегодняшнее ярче.
                   */
                  isCurrent ? 'bg-accent' : 'bg-accent-muted',
                  'transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] group-hover:bg-accent',
                )}
                style={{ height, ...riseDelay(index * 24) }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-bg shadow-lifted group-hover:block">
                {point.title}: {formatValue(point.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recessive axis: labels only, no rules. */}
      <div className="flex gap-[2px]">
        {data.map((point) => (
          <span
            key={`label-${point.label}-${point.title}`}
            className="flex-1 truncate text-center text-[11px] text-ink-soft"
            style={spacious ? { maxWidth: MAX_BAR_WIDTH_PX } : undefined}
          >
            {point.label}
          </span>
        ))}
      </div>

      <figcaption className="text-xs text-ink-soft">{caption}</figcaption>

      {/* The accessible view of the same numbers — colour and height are never the only encoding. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((point) => (
            <tr key={`row-${point.title}`}>
              <th scope="row">{point.title}</th>
              <td>{formatValue(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
