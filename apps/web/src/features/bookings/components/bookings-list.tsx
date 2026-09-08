'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { getBookingStatusMeta } from '../status-meta';
import type { Booking } from '../types';

/** Подпись длительности: «1 ч 30 мин» без нулевых частей. */
function duration(minutes: number, t: Messages): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ${t.common.hourShort} ${m} ${t.common.minuteShort}`;
  if (h) return `${h} ${t.common.hourShort}`;
  return `${m} ${t.common.minuteShort}`;
}

/**
 * Записи списком — по артборду `BookingsMobile.dc.html`.
 *
 * На телефоне таблица из семи колонок превращалась в карточку с подписями
 * («Дата: Сегодня», «Время: 10:00»), где половину места занимают слова
 * «Дата» и «Время». В макете это ряд: слева час и длительность, справа кто и
 * на что, разделённый по дням.
 *
 * Группа по дню, а не одна лента: «сегодня» и «в четверг» — разные вопросы, и
 * заголовок отвечает на них один раз, вместо того чтобы повторять дату в
 * каждой строке.
 */
export function BookingsList({
  bookings,
  onOpen,
  todayKey,
  tomorrowKey,
}: {
  bookings: Booking[];
  onOpen: (booking: Booking) => void;
  todayKey: string;
  tomorrowKey: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t);

  const dayFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const keyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  /* Группы в порядке самих записей: список уже отсортирован экраном, и
     пересортировывать его здесь значило бы завести второе мнение о порядке. */
  const groups: { key: string; label: string; rows: Booking[] }[] = [];
  for (const booking of bookings) {
    const key = keyFormat.format(new Date(booking.startsAt));
    const label =
      key === todayKey
        ? t.bookings.today
        : key === tomorrowKey
          ? t.bookings.tomorrow
          : dayFormat.format(new Date(booking.startsAt));

    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(booking);
    else groups.push({ key, label, rows: [booking] });
  }

  return (
    <div className="bookings-list">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="t-label bookings-list__day">{group.label}</h3>
          {group.rows.map((booking) => {
            const minutes = booking.items.reduce(
              (sum, item) => sum + item.durationMinutesSnapshot,
              0,
            );
            const status = meta[booking.status];

            return (
              <button
                type="button"
                className="day-row"
                key={booking.id}
                onClick={() => onOpen(booking)}
              >
                <span className="col day-row__when">
                  <span className="tnum" style={{ fontSize: 15, fontWeight: 600 }}>
                    {formatTime(booking.startsAt, locale, timeZone)}
                  </span>
                  <span className="tnum t-meta" style={{ fontSize: 11.5 }}>
                    {duration(minutes, t)}
                  </span>
                </span>

                <span className="col day-row__what">
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {booking.guestName ?? t.admin.noName}
                  </span>
                  <span className="t-meta day-row__service">
                    {booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
                  </span>
                </span>

                {booking.status === 'pending' ? (
                  <span className="badge b-amber">
                    <span className="dot" />
                    {status.label}
                  </span>
                ) : (
                  <Icon name="chevR" className="ico-16" />
                )}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
