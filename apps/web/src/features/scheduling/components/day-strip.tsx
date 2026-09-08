'use client';

import type { WeekDay } from '../week';

/**
 * Полоса недели на телефоне — по артборду `CalendarMobile.dc.html`.
 *
 * Семь дней в ряд, выбранный залит чернилами. Точка под числом значит, что в
 * этот день что-то есть: розовая — записи, чернильная — только свободные окна.
 * Пустой день остаётся без точки, и это единственный способ увидеть неделю
 * целиком там, где сетка на семь колонок не помещается.
 *
 * Заменяет стрелки «‹ ›»: на телефоне перелистывать день за днём, чтобы найти
 * четверг, — это три нажатия вместо одного.
 */
export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: WeekDay[];
  selected: string;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <div className="day-strip">
      {days.map((day) => {
        const on = day.dateKey === selected;
        const dot = day.bookedCount > 0 ? 'is-booked' : day.availableCount > 0 ? 'is-free' : '';

        return (
          <button
            type="button"
            key={day.dateKey}
            className={on ? 'day-strip__day is-on' : 'day-strip__day'}
            aria-current={on ? 'date' : undefined}
            onClick={() => onSelect(day.dateKey)}
          >
            <span className="day-strip__weekday">{day.weekdayShort}</span>
            <span className="tnum day-strip__number">{day.dayNumber}</span>
            <span className={`day-strip__dot ${dot}`} />
          </button>
        );
      })}
    </div>
  );
}
