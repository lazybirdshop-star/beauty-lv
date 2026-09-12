'use client';

import type { CSSProperties } from 'react';

import type { WeekDay } from '../week';

/** Сколько точек услуг помещается под числом. */
const MAX_DOTS = 4;

/**
 * Лента дней над сеткой — Design System V2 §6: семь ячеек, точки услуг
 * под числом, выбранный день поднят (правило 03), сегодняшний отмечен
 * розовой точкой.
 *
 * Заменяет стрелки «‹ ›» на телефоне: перелистывать день за днём, чтобы найти
 * четверг, — это три нажатия вместо одного. На большом экране стоит над
 * дневной сеткой (Flowstep) — поведение то же.
 */
export function DayStrip({
  days,
  selected,
  tones,
  onSelect,
}: {
  days: WeekDay[];
  selected: string;
  /** Тона услуг дня, по одному на визит, — точки под числом. */
  tones?: ReadonlyMap<string, readonly string[]>;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <div className="day-strip" role="group">
      {days.map((day) => {
        const on = day.dateKey === selected;
        const dayTones = (tones?.get(day.dateKey) ?? []).slice(0, MAX_DOTS);

        return (
          <button
            type="button"
            key={day.dateKey}
            className={on ? 'day-strip__day is-on' : 'day-strip__day'}
            data-selected={on ? 'true' : undefined}
            aria-current={on ? 'date' : undefined}
            aria-pressed={on}
            onClick={() => onSelect(day.dateKey)}
          >
            <span className="day-strip__weekday type-meta">{day.weekdayShort}</span>
            <span className="tnum day-strip__number">{day.dayNumber}</span>
            <span className="day-strip__dots" aria-hidden="true">
              {day.isToday ? <span className="day-strip__today" /> : null}
              {dayTones.map((tone, index) => (
                <span
                  key={index}
                  className="day-strip__dot"
                  style={{ '--tone': tone } as CSSProperties}
                />
              ))}
              {!day.isToday && dayTones.length === 0 && day.availableCount > 0 ? (
                <span className="day-strip__dot day-strip__dot--free" />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
