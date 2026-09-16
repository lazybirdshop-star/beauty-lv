'use client';

import type { CSSProperties } from 'react';

import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { CalendarEntry, GridColumn } from '../calendar-columns';
import { clock, minutesOfDay } from '../calendar-model';
import { calendarSummary, isSlotOpen } from '../calendar-summary';
import { formatWeekRange, type WeekDay } from '../week';

/** Сколько окон дня названо чипами; остальное — «ещё N», ведущее в день. */
const FREE_CHIPS = 4;

/**
 * Неделя на телефоне — прототип «Кабинет 2026», `.wk-load` и `.agenda-day`.
 *
 * Сверху загрузка: столбик на день, высота — записи относительно самого
 * занятого дня, под ним — сколько окон осталось за неделю. Ниже все семь дней
 * подряд: «понедельник, 14 · 5 записей · 2 окна», визиты строками и свободные
 * окна чипами. Раньше неделя списком показывала одни визиты и только дни с
 * ними: мастер не видела, где у неё ещё можно записаться, — ради этого вопроса
 * неделю и открывают.
 *
 * Выходной — день без окон и без визитов, то же правило, что у сетки.
 */
export function CalendarAgenda({
  days,
  columns,
  entries,
  timeZone,
  onOpen,
  onSlot,
  onDay,
}: {
  days: WeekDay[];
  /** Колонки недели — по дню, с окнами того, чьё время смотрят. */
  columns: GridColumn[];
  entries: CalendarEntry[];
  timeZone: string;
  onOpen: (bookingId: string) => void;
  onSlot: (slotId: string) => void;
  /** Нажатие по дню загрузки или «ещё N» — этот день целиком. */
  onDay: (dateKey: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const meta = getBookingStatusMeta(t);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone });

  const rows = days.map((day) => {
    const column = columns.find((item) => item.dateKey === day.dateKey);
    const visits = entries
      .filter((entry) => entry.dateKey === day.dateKey)
      .sort((a, b) => a.at - b.at);
    /* Окна прошедшего дня уже не продать — чипами они обещали бы запись в
       прошлое. */
    const free =
      column && !day.isPast
        ? column.slots.filter((slot) => isSlotOpen(slot, entries, column.key, timeZone))
        : [];
    return { day, visits, free, closed: !column?.slots.length && !visits.length };
  });

  const week = calendarSummary(entries, columns, timeZone);
  const freeThisWeek = rows.reduce((sum, row) => sum + row.free.length, 0);
  const income = week.income
    .map(([currency, amount]) => formatPrice(amount, currency, locale))
    .join(' + ');
  const busiest = Math.max(1, ...rows.map((row) => row.visits.length));
  const count = (n: number, forms: typeof t.common.bookingForms) =>
    `${n} ${plural(locale, n, forms)}`;

  return (
    <>
      <section className="card week-load">
        <h2 className="type-title">
          {fmt(t.schedule.weekTitle, { range: formatWeekRange(days, locale, timeZone) })}
        </h2>
        <p className="week-load__meta tnum">
          {[count(week.bookings, t.common.bookingForms), income].filter(Boolean).join(' · ')}
        </p>
        <div className="week-load__bars">
          {rows.map(({ day, visits, closed }) => (
            <button
              type="button"
              key={day.dateKey}
              className={cn('week-load__day', day.isToday && 'is-today', closed && 'is-off')}
              onClick={() => onDay(day.dateKey)}
            >
              <span className="week-load__weekday">{day.weekdayShort}</span>
              <b className="tnum">{day.dayNumber}</b>
              <i
                aria-hidden="true"
                style={{
                  height: `${closed ? 3 : Math.max(6, (visits.length / busiest) * 100)}%`,
                }}
              />
              <span className="week-load__count tnum">{closed ? '—' : visits.length}</span>
            </button>
          ))}
        </div>
        <p className="week-load__caption">
          <span>{t.schedule.weekPerDay}</span>
          <span className="tnum">
            {fmt(t.schedule.weekFreeTotal, { count: String(freeThisWeek) })}
          </span>
        </p>
      </section>

      <div className="card calendar-agenda">
        {rows.map(({ day, visits, free, closed }) => (
          <section
            key={day.dateKey}
            className={cn('calendar-agenda__day', day.isToday && 'is-today')}
          >
            {/* `h2`: над списком стоит только заголовок страницы — уровень
                не должен прыгать через один. */}
            <h2 className="calendar-agenda__head">
              <b>
                {weekday.format(day.date)}, {day.dayNumber}
              </b>
              {day.isToday ? (
                <span className="calendar-agenda__today">{t.workspace.todayMark}</span>
              ) : null}
              <span className="calendar-agenda__count tnum">
                {closed
                  ? t.schedule.weekDayOff
                  : [
                      count(visits.length, t.common.bookingForms),
                      free.length ? count(free.length, t.common.slotForms) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </span>
            </h2>

            {visits.length ? (
              <div className="calendar-agenda__rows">
                {visits.map((entry) => {
                  const status = entry.booking.status;
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      className={cn(
                        'calendar-agenda__row',
                        status === 'pending' && 'is-new',
                        status === 'completed' && 'is-done',
                        status === 'no_show' && 'is-noshow',
                      )}
                      onClick={() => onOpen(entry.id)}
                    >
                      <span className="calendar-agenda__time tnum">{clock(entry.at)}</span>
                      <i
                        className="calendar-agenda__dot"
                        style={{ '--member': `var(--tone-${entry.memberTone})` } as CSSProperties}
                        aria-hidden="true"
                      />
                      <span className="calendar-agenda__name">{entry.clientName}</span>
                      <span className="calendar-agenda__svc">
                        {entry.serviceName}
                        {/* Статус в строке недели — цветом имени, как в
                            прототипе; читалке — словом. */}
                        <span className="sr-only">, {meta[status].label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {free.length ? (
              <div className="calendar-agenda__free" aria-label={t.schedule.freeSlotsTitle}>
                {free.slice(0, FREE_CHIPS).map((slot) => (
                  <button
                    type="button"
                    key={slot.id}
                    className="calendar-agenda__chip tnum"
                    onClick={() => onSlot(slot.id)}
                  >
                    {clock(minutesOfDay(slot.startsAt, timeZone))}
                  </button>
                ))}
                {free.length > FREE_CHIPS ? (
                  <button
                    type="button"
                    className="calendar-agenda__more"
                    onClick={() => onDay(day.dateKey)}
                  >
                    {fmt(t.schedule.weekMoreFree, { count: String(free.length - FREE_CHIPS) })}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}
