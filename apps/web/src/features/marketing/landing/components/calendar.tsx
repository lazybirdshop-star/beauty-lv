/**
 * Мокап календаря — один компонент на все шесть мест, где он стоит.
 *
 * В исходной статической странице календари собирались строкой в
 * `innerHTML`. Здесь это разметка, а не строка: React рисует её и на сервере,
 * поэтому читатель без JavaScript получает расписание, а не пустой блок,
 * — а с ним и повод поверить, что продукт существует.
 *
 * Высота дня считается в часах: колонка получает `--hours`, а каждая
 * карточка — свою вершину и высоту в тех же `--hour`. Никакой сетки: запись
 * может начинаться в 10:30, и ячейке под неё взяться неоткуда.
 */
import type { CSSProperties } from 'react';

import { PEOPLE, toClock, toHours, type Appointment, type PersonKey } from '../lib/day';

export type CalendarProps = {
  /** Границы дня в часах: 9 и 17 — это с 09:00 до 17:00. */
  start: number;
  end: number;
  columns: readonly PersonKey[];
  appointments: readonly Appointment[];
  title?: string;
  date?: string;
  /** Переключатель «День / Неделя» в шапке. */
  views?: { day: string; week: string } | null;
  /** Шапку можно снять — в тесных врезках она съедает половину высоты. */
  head?: boolean;
  /** Пунктирная колонка «Добавить мастера» — сцена роста в салон. */
  ghost?: string | null;
  /**
   * Сколько колонок раскрыто. Остальные схлопываются, а не исчезают из
   * разметки: сцена роста обязана раздвигать один и тот же календарь, иначе
   * довод «ваши клиенты и ссылка остаются на месте» не читается.
   */
  visibleColumns?: number;
  /** Подпись свободного окна. */
  freeLabel: string;
  className?: string;
  id?: string;
};

export function Calendar({
  start,
  end,
  columns,
  appointments,
  title = 'Studio Nara',
  date,
  views = null,
  head = true,
  ghost = null,
  visibleColumns,
  freeLabel,
  className,
  id,
}: CalendarProps) {
  const hours = end - start;
  const style = { '--hours': hours } as CSSProperties;

  return (
    <div className={className ? `cal ${className}` : 'cal'} style={style} id={id}>
      {head ? (
        <div className="cal__head">
          <span className="cal__title">{title}</span>
          {date ? <span className="cal__date">{date}</span> : null}
          {views ? (
            <span className="cal__views">
              <span className="on">{views.day}</span>
              <span>{views.week}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="cal__body">
        <div className="cal__gutter">
          {Array.from({ length: hours }, (_, i) => start + i).map((hour) => (
            <span
              key={hour}
              style={{ top: `calc(var(--colhead-h, 44px) + var(--hour) * ${hour - start})` }}
            >
              {toClock(hour)}
            </span>
          ))}
        </div>

        {columns.map((key, col) => {
          const person = PEOPLE[key];

          return (
            <div
              className={
                visibleColumns !== undefined && col >= visibleColumns
                  ? 'cal__col is-hidden'
                  : 'cal__col'
              }
              data-col={col}
              key={key}
            >
              <div className="cal__colhead">
                <span className={`avatar ${person.avatarTone}`}>{person.initials}</span>
                {person.name}
              </div>
              <div className="cal__track">
                {appointments
                  .filter((appointment) => appointment.col === col)
                  .map((appointment, index) => (
                    <Slot
                      key={`${appointment.at}-${index}`}
                      appointment={appointment}
                      start={start}
                      tone={person.apptTone}
                      freeLabel={freeLabel}
                    />
                  ))}
              </div>
            </div>
          );
        })}

        {ghost ? (
          <div
            className={
              visibleColumns !== undefined && visibleColumns >= columns.length
                ? 'cal__col cal__col--ghost is-hidden'
                : 'cal__col cal__col--ghost'
            }
            aria-hidden="true"
          >
            <div className="cal__colhead">
              <span className="cal__plus">+</span>
              {ghost}
            </div>
            <div className="cal__track" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Slot({
  appointment,
  start,
  tone,
  freeLabel,
}: {
  appointment: Appointment;
  start: number;
  tone: string;
  freeLabel: string;
}) {
  const from = toHours(appointment.at);
  const height = appointment.minutes / 60;
  const style = {
    top: `calc(var(--hour) * ${from - start})`,
    height: `calc(var(--hour) * ${height} - 4px)`,
  };

  if (appointment.free) {
    return (
      <div className="appt appt--free" style={style}>
        {freeLabel}
      </div>
    );
  }

  const pops = appointment.popDelayMs !== undefined;
  const classes = ['appt', appointment.tone || tone, pops ? 'appt--pop' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={pops ? { ...style, animationDelay: `${appointment.popDelayMs}ms` } : style}
    >
      <div className="appt__t">{appointment.service}</div>
      <div className="appt__c">{appointment.client}</div>
      {/* Время подписано только там, где для него есть место: у получасовой
          карточки третья строка вылезает за границу и обрезается. */}
      {appointment.minutes >= 45 ? (
        <div className="appt__time">
          {appointment.at}–{toClock(from + height)}
        </div>
      ) : null}
    </div>
  );
}
