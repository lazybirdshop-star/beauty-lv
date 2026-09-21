/**
 * Мокап календаря — один компонент на все восемь мест, где он стоит.
 *
 * Рисует командный день кабинета, а не собственную придумку лендинга: та же
 * шапка колонки (портрет, имя, полоса загрузки в тоне мастера), тот же визит
 * (поле в тоне мастера, точка услуги перед именем клиента, время последним),
 * тот же пунктир свободного окна и та же чернильная линия «сейчас» с
 * прожитой частью дня в тени. Источник устройства —
 * `features/scheduling/components/calendar-grid.tsx`, источник цвета —
 * `styles/dashboard-ui.css`, сверенный тестом с токенами кабинета. Мастер,
 * пришедший с лендинга, открывает после регистрации тот же экран, который
 * ему здесь показали.
 *
 * Разметка, а не строка: React рисует её и на сервере, поэтому читатель без
 * JavaScript получает расписание, а не пустой блок.
 *
 * Высота дня считается в часах: колонка получает `--hours`, а каждая
 * карточка — свою вершину и высоту в тех же `--hour`. Никакой сетки: запись
 * может начинаться в 10:30, и ячейке под неё взяться неоткуда.
 */
import type { CSSProperties } from 'react';

import {
  PEOPLE,
  serviceTone,
  toClock,
  toHours,
  type Appointment,
  type PersonKey,
  type PersonTone,
} from '../lib/day';

export type CalendarProps = {
  /** Границы дня в часах: 9 и 17 — это с 09:00 до 17:00. */
  start: number;
  end: number;
  columns: readonly PersonKey[];
  appointments: readonly Appointment[];
  /** Подпись рядом с датой — заведение или «Сегодня». */
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
  /**
   * «Сейчас» дня, `'14:02'`. Как в кабинете: линия поперёк колонок, час
   * пилюлей в шкале, прожитое — в тени, прошедшие визиты — в утопленном
   * тоне. Без него день нарисован целиком, как расписание наперёд.
   */
  now?: string;
  /** Подпись свободного окна. */
  freeLabel: string;
  className?: string;
  id?: string;
};

/** Тон мастера в переменные колонки — те же имена, что у `.cal-appt` кабинета. */
export function memberStyle(tone: PersonTone): CSSProperties {
  return {
    '--member': `var(--tone-${tone})`,
    '--member-soft': `var(--tone-${tone}-soft)`,
    '--member-ink': `var(--tone-${tone}-ink)`,
  } as CSSProperties;
}

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
  now,
  freeLabel,
  className,
  id,
}: CalendarProps) {
  const hours = end - start;
  const style = { '--hours': hours } as CSSProperties;
  const nowAt = now === undefined ? null : toHours(now);
  const nowIn = nowAt !== null && nowAt > start && nowAt < end;

  /* Доля окна дня, занятая визитами, — полоса загрузки под именем. */
  const loadOf = (col: number) => {
    const busy = appointments
      .filter((appointment) => appointment.col === col && !appointment.free)
      .reduce((sum, appointment) => sum + appointment.minutes, 0);
    return Math.min(100, Math.round((busy / (hours * 60)) * 100));
  };

  return (
    <div className={className ? `cal ${className}` : 'cal'} style={style} id={id}>
      {head ? (
        <div className="cal__head">
          {date ? <span className="cal__lead">{date}</span> : null}
          <span className="cal__sub">{title}</span>
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
          {Array.from({ length: hours }, (_, i) => start + i).map((hour) =>
            /* Час, на который легла бы пилюля «сейчас», не печатается —
               две цифры рядом кабинет не рисует. */
            nowIn && Math.abs(hour - nowAt) < 1 / 3 ? null : (
              <span
                key={hour}
                style={{ top: `calc(var(--colhead-h) + var(--hour) * ${hour - start})` }}
              >
                {toClock(hour)}
              </span>
            ),
          )}
          {nowIn ? (
            <span
              className="cal__now-time"
              style={{ top: `calc(var(--colhead-h) + var(--hour) * ${nowAt - start})` }}
            >
              {now}
            </span>
          ) : null}
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
              style={memberStyle(person.tone)}
            >
              <div className="cal__colhead">
                <span className="cal__avatar">{person.initials}</span>
                <span className="cal__name">{person.name}</span>
                <span className="cal__load" aria-hidden="true">
                  <i style={{ width: `${loadOf(col)}%` }} />
                </span>
              </div>
              <div
                className="cal__track"
                style={
                  nowIn
                    ? ({ '--past': `calc(var(--hour) * ${nowAt - start})` } as CSSProperties)
                    : undefined
                }
              >
                {appointments
                  .filter((appointment) => appointment.col === col)
                  .map((appointment, index) => (
                    <Slot
                      key={`${appointment.at}-${index}`}
                      appointment={appointment}
                      start={start}
                      nowAt={nowAt}
                      freeLabel={freeLabel}
                      single={columns.length === 1}
                    />
                  ))}
                {nowIn ? (
                  <div
                    className="cal__now"
                    style={{ top: `calc(var(--hour) * ${nowAt - start})` }}
                    aria-hidden="true"
                  />
                ) : null}
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
              <span className="cal__name">{ghost}</span>
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
  nowAt,
  freeLabel,
  single,
}: {
  appointment: Appointment;
  start: number;
  nowAt: number | null;
  freeLabel: string;
  /** Одна колонка — окно подписано словами; в команде только часами. */
  single: boolean;
}) {
  const from = toHours(appointment.at);
  const length = appointment.minutes / 60;
  const to = from + length;
  const style = {
    top: `calc(var(--hour) * ${from - start} + 1px)`,
    height: `calc(var(--hour) * ${length} - 2px)`,
  };
  const span = `${appointment.at}–${toClock(to)}`;

  if (appointment.free) {
    return (
      <div className="appt appt--free" style={style}>
        {single ? `${span} · ${freeLabel}` : span}
      </div>
    );
  }

  const past = nowAt !== null && to <= nowAt;
  const current = nowAt !== null && from <= nowAt && nowAt < to;
  const pops = appointment.popDelayMs !== undefined;
  const classes = ['appt', past ? 'is-past' : '', current ? 'is-now' : '', pops ? 'appt--pop' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={
        {
          ...style,
          ...(pops ? { animationDelay: `${appointment.popDelayMs}ms` } : {}),
          '--svc': `var(--service-${serviceTone(appointment.service ?? '')})`,
        } as CSSProperties
      }
    >
      {/* Порядок визита кабинета: кто, что и — когда блок высокий — когда.
          Положение блока уже называет час, поэтому время последним. */}
      <div className="appt__name">{appointment.client}</div>
      {appointment.minutes >= 45 ? <div className="appt__meta">{appointment.service}</div> : null}
      {appointment.minutes >= 75 ? <div className="appt__time">{span}</div> : null}
    </div>
  );
}
