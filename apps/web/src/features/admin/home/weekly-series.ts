import type { BarChartPoint } from '@/components/ui/bar-chart';
import { fmt, type Messages } from '@/lib/i18n/messages';

export interface WeeklyPoint {
  /** Понедельник недели, `YYYY-MM-DD` — так его отдаёт `date_trunc('week')`. */
  week: string;
  value: number;
}

/** Понедельник недели, в которую попала дата. Тот же день, что берёт Postgres. */
function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // `getDay()`: воскресенье — 0, и его понедельник лежит на шесть дней назад.
  const shift = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - shift);
  return monday;
}

function isoKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Ряд без пропусков: недели, в которые ничего не произошло, стоят нулями.
 *
 * `GROUP BY` отдаёт только те недели, в которых были строки, — и график
 * ставил два столбца, разнесённых на месяц, вплотную друг к другу. Столбчатый
 * график по времени обещает равный шаг: соседние столбцы читаются как соседние
 * недели, и пропуск в данных превращается в неверную картинку, а не в честную
 * дыру.
 *
 * Ноль и отсутствие строк здесь одно и то же по смыслу: «за эту неделю никто
 * не зарегистрировался» — это ноль, а не «нет данных».
 */
export function fillWeeks(points: WeeklyPoint[], weeks: number, today = new Date()): WeeklyPoint[] {
  const byWeek = new Map(points.map((point) => [point.week, point.value]));
  const start = mondayOf(today);
  const series: WeeklyPoint[] = [];

  for (let back = weeks - 1; back >= 0; back -= 1) {
    const monday = new Date(start);
    monday.setDate(monday.getDate() - back * 7);
    const key = isoKey(monday);
    series.push({ week: key, value: byWeek.get(key) ?? 0 });
  }

  return series;
}

/**
 * Подписи оси: число дня, а у первого столбца и на смене месяца — с месяцем.
 *
 * Голое «27» не говорит ни о чём: двенадцать чисел подряд читаются как набор,
 * а не как календарь. Печатать месяц у каждого столбца тоже нельзя — на
 * телефоне двенадцать «27 авг» не поместятся. Месяц называется там, где он
 * меняется, ровно как в бумажном календаре.
 */
export function weekPoints(points: WeeklyPoint[], locale: string, t: Messages): BarChartPoint[] {
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const monthOnly = new Intl.DateTimeFormat(locale, { month: 'short' });

  let previousMonth: number | null = null;

  return points.map((point) => {
    const date = new Date(`${point.week}T00:00:00`);
    const month = date.getMonth();
    const startsMonth = previousMonth === null || previousMonth !== month;
    previousMonth = month;

    return {
      label: startsMonth ? `${date.getDate()} ${monthOnly.format(date)}` : String(date.getDate()),
      title: fmt(t.adminHome.weekOf, { date: dayMonth.format(date) }),
      value: point.value,
    };
  });
}
