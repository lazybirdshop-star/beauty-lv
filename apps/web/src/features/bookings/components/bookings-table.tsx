'use client';

/**
 * Таблица записей — по артборду `Bookings.dc.html`.
 *
 * Таблица, а не карточки: на этом экране мастер сравнивает строки между собой
 * — во сколько, кто, сколько длится, ответила ли она уже, — и сравнивать
 * удобно колонками. Карточки остались там, где строка читается сама по себе:
 * на телефоне (там таблица превращается в список).
 *
 * Дата подписана словом там, где слово короче даты: «Сегодня» и «Завтра»
 * мастер читает не считая.
 */
import { Icon } from '@/features/dashboard-shell/components/icon';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import type { Booking, BookingStatus } from '../types';

/** Тон значка статуса в наборе макета. */
const TONE: Record<BookingStatus, string> = {
  pending: 'b-amber',
  confirmed: 'b-green',
  completed: 'b-neutral',
  cancelled_by_client: 'b-red',
  cancelled_by_master: 'b-red',
  no_show: 'b-red',
  expired: 'b-neutral',
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function BookingsTable({
  bookings,
  onOpen,
  todayKey,
  tomorrowKey,
}: {
  bookings: Booking[];
  onOpen: (booking: Booking) => void;
  /** Ключи суток заведения — по ним строка подписывается словом. */
  todayKey: string;
  tomorrowKey: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t);

  /*
   * Дата в колонке — «Чт 4 сен», без года: год в списке ближайших записей
   * одинаков у всех строк и ничего не различает, а место занимает.
   */
  const dayFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  /** «28 авг» — когда запись завели. Времени здесь нет: важен день. */
  const madeFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: 'numeric',
    month: 'short',
  });

  const dayLabel = (iso: string) => {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
    if (key === todayKey) return t.bookings.today;
    if (key === tomorrowKey) return t.bookings.tomorrow;
    return dayFormat.format(new Date(iso));
  };

  /** «1 ч 30 м» вместо «90 мин»: полтора часа человек в уме не переводит. */
  const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h} ${t.common.hourShort} ${m} ${t.common.minuteShort}`;
    if (h) return `${h} ${t.common.hourShort}`;
    return `${m} ${t.common.minuteShort}`;
  };

  return (
    <div className="card bookings-table">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>{t.bookings.colDate}</th>
            <th style={{ width: 74 }}>{t.bookings.colTime}</th>
            <th>{t.bookings.colClient}</th>
            <th>{t.bookings.colService}</th>
            <th style={{ width: 96 }}>{t.bookings.colDuration}</th>
            <th style={{ width: 128 }}>{t.bookings.colStatus}</th>
            <th style={{ width: 150 }}>{t.bookings.colCreated}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const name = booking.guestName || t.home.guest;
            const minutes =
              booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;

            return (
              <tr
                key={booking.id}
                tabIndex={0}
                role="button"
                onClick={() => onOpen(booking)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(booking);
                  }
                }}
              >
                <td data-label={t.bookings.colDate} style={{ fontWeight: 600 }}>
                  {dayLabel(booking.startsAt)}
                </td>
                <td className="tnum" data-label={t.bookings.colTime} style={{ fontWeight: 600 }}>
                  {formatTime(booking.startsAt, locale, timeZone)}
                </td>
                <td data-label="">
                  <span className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                      {initials(name)}
                    </span>
                    <span>{name}</span>
                  </span>
                </td>
                <td data-label={t.bookings.colService} style={{ whiteSpace: 'normal' }}>
                  {booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
                </td>
                <td data-label={t.bookings.colDuration}>{duration(minutes)}</td>
                <td data-label="">
                  <span className={`badge ${TONE[booking.status]}`}>
                    <span className="dot" />
                    {meta[booking.status].label}
                  </span>
                </td>
                <td className="t-meta" data-label={t.bookings.colCreated}>
                  {madeFormat.format(new Date(booking.createdAt))}
                  {' · '}
                  {booking.source === 'public_page' ? t.bookings.byClient : t.bookings.byYou}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {bookings.length === 0 ? (
        <div className="bookings-empty">
          <Icon name="calendar" className="ico-24" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t.bookings.emptyTitle}</span>
          <span className="t-meta" style={{ maxWidth: 300, textAlign: 'center' }}>
            {t.bookings.emptyHint}
          </span>
        </div>
      ) : null}
    </div>
  );
}
