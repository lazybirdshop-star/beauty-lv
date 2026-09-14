/**
 * Доход по дням месяца — `.heat` прототипа «Кабинет 2026».
 *
 * Тонкие столбики на всю ширину ячейки: прошедшие дни — высотой дохода,
 * сегодня — насыщенным, будущие — чертой у основания. Краска — чернила
 * ячейки, поэтому полоса одинаково читается на светлой и на тёмной теме.
 *
 * Списком, а не картинкой: сумма дня доступна читалке словами, высота не
 * единственный её носитель. Будущие дни читалке не нужны — дохода у них нет.
 */
import type { DayRevenue } from '../daily-revenue';

export function RevenueHeat({
  days,
  titles,
  label,
  caption,
}: {
  days: DayRevenue[];
  /** Подпись каждого дня — дата и сумма; того же порядка, что `days`. */
  titles: string[];
  label: string;
  /** Первый день, сегодня, последний день. */
  caption: [string, string, string];
}) {
  const max = Math.max(1, ...days.map((day) => day.revenue));

  return (
    <figure className="finance-heat">
      <ul className="finance-heat__days" aria-label={label}>
        {days.map((day, index) => (
          <li
            key={day.key}
            className={day.isToday ? 'is-today' : day.isFuture ? 'is-future' : undefined}
            title={day.isFuture ? undefined : titles[index]}
            aria-hidden={day.isFuture ? true : undefined}
          >
            <i
              style={
                day.isFuture ? undefined : { height: `${Math.round((day.revenue / max) * 100)}%` }
              }
            />
            {day.isFuture ? null : <span className="sr-only">{titles[index]}</span>}
          </li>
        ))}
      </ul>
      <figcaption className="finance-heat__caption" aria-hidden="true">
        <span>{caption[0]}</span>
        <span>{caption[1]}</span>
        <span>{caption[2]}</span>
      </figcaption>
    </figure>
  );
}
