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
  className?: string;
}

const CHART_HEIGHT_PX = 132;
const MIN_BAR_PX = 3;

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
export function BarChart({ data, formatValue, caption, className }: BarChartProps) {
  const max = Math.max(...data.map((point) => point.value), 0);

  if (data.length === 0 || max === 0) {
    return (
      <div className={cn('rounded-2xl bg-bg-sunken/70 px-4 py-10 text-center', className)}>
        <p className="text-sm text-ink-soft">Пока нет данных за этот период</p>
      </div>
    );
  }

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div
        className="flex items-end gap-[2px]"
        style={{ height: CHART_HEIGHT_PX }}
        role="presentation"
      >
        {data.map((point) => {
          const height =
            point.value > 0 ? Math.max((point.value / max) * CHART_HEIGHT_PX, MIN_BAR_PX) : 0;
          const isPeak = point.value === max;
          return (
            <div
              key={point.label + point.title}
              tabIndex={0}
              /* Focusable so the tooltip is reachable from the keyboard, not
                 hover-only; the sr-only table below is the real AT path. */
              className="group relative flex flex-1 cursor-default flex-col justify-end rounded-t-[4px] focus-visible:outline-none"
            >
              <span
                className={cn(
                  'w-full rounded-t-[4px] transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  isPeak ? 'bg-accent' : 'bg-accent/55',
                  'group-hover:bg-accent group-focus-visible:bg-accent',
                )}
                style={{ height }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-bg shadow-lifted group-hover:block group-focus-visible:block">
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
            className="flex-1 truncate text-center text-[10px] text-ink-soft"
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
