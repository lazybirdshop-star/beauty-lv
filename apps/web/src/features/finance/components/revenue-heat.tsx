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
import type { ReactNode } from 'react';

import type { DayRevenue } from '../daily-revenue';

export function RevenueHeat({
  days,
  titles,
  label,
  caption,
  peak,
}: {
  days: DayRevenue[];
  /** Подпись каждого дня — дата и сумма; того же порядка, что `days`. */
  titles: string[];
  label: string;
  /** Первый день, сегодня, последний день. */
  caption: [string, string, string];
  /**
   * Самый дорогой день срока — словами и суммой.
   *
   * Без единого значения полоса остаётся силуэтом: высоты сравниваются
   * между собой и ни с чем в деньгах (критика 2026-09-28). Названная
   * вершина даёт шкалу — по ней читаются и все остальные дни.
   */
  peak?: ReactNode;
}) {
  const max = Math.max(1, ...days.map((day) => day.revenue));
  const todayIndex = Math.max(
    0,
    days.findIndex((day) => day.isToday),
  );
  /* Доля оси, на которой стоит «сегодня». У конца месяца эта подпись
     садится на подпись последнего дня и склеивается с ней в «сегодня,
     2730 сен» (критика 2026-09-27), поэтому край, к которому «сегодня»
     подошло вплотную, уступает ему место: своё число он и так называет. */
  const todayAt = (todayIndex + 0.5) / days.length;
  const EDGE = 0.18;

  return (
    <figure className="finance-heat">
      {peak ? <p className="finance-heat__peak">{peak}</p> : null}
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
      {/* Подпись «сегодня» стоит под своим столбиком, а не посередине оси:
          25-е число месяца оказывалось на 155 px левее своей отметки
          (критика 2026-09-25). Края держат первый и последний день. */}
      <figcaption className="finance-heat__caption" aria-hidden="true">
        <span>{todayAt > EDGE ? caption[0] : ''}</span>
        <span className="finance-heat__today" style={{ left: `${todayAt * 100}%` }}>
          {caption[1]}
        </span>
        <span>{todayAt < 1 - EDGE ? caption[2] : ''}</span>
      </figcaption>
    </figure>
  );
}
