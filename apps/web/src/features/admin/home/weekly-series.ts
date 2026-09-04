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
 * Ряд для столбиков и линии панели платформы.
 *
 * Подпись недели — «W35», как в артборде: администратор сравнивает недели
 * между собой, и номер недели короче любой даты и не спорит с соседней.
 * Полная дата остаётся в подсказке — там, где на неё смотрят намеренно.
 */
export function weekBars(
  points: WeeklyPoint[],
  locale: string,
  unit: string,
): { key: string; label: string; title: string; value: number }[] {
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  return points.map((point) => {
    const monday = new Date(`${point.week}T00:00:00`);
    return {
      key: point.week,
      label: `W${isoWeek(monday)}`,
      title: `${dayMonth.format(monday)} · ${point.value} ${unit}`,
      value: point.value,
    };
  });
}

/** Номер недели по ISO 8601 — тот же, что печатает `date_trunc('week')`. */
function isoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}
