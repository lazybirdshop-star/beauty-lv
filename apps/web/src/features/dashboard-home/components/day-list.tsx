'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';

import type { TimelineEntry, TimelineGap } from '../timeline';

/** Подпись длительности: «1 ч 30 мин» без нулевых частей. */
function duration(minutes: number, t: Messages): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ${t.common.hourShort} ${m} ${t.common.minuteShort}`;
  if (h) return `${h} ${t.common.hourShort}`;
  return `${m} ${t.common.minuteShort}`;
}

/**
 * День списком — по артборду `HomeMobile.dc.html`.
 *
 * На телефоне линейка «минута равна пикселю» не работает: между записями в
 * два часа остаётся пустой экран, а сама запись сжимается до нечитаемой
 * полоски. Список даёт то же самое — что за чем и сколько длится, — не тратя
 * на пустоту ни пикселя.
 *
 * Ряд один и тот же у прошедших и будущих, но прошедшие приглушены: день
 * читается сверху вниз, и «где я сейчас» должно быть видно, не считая часы.
 *
 * Свободные окна остаются строкой: «свободно до 13:00» — это то, что мастер
 * ищет, когда ей звонят и просят «когда сможете».
 */
export function DayList({
  entries,
  gaps,
  timeZone,
  locale,
}: {
  entries: TimelineEntry[];
  gaps: TimelineGap[];
  timeZone: string;
  locale: string;
}) {
  const t = useT();

  /* «Сейчас» спрашивается после гидратации и раз в минуту: часы во время
     отрисовки разошлись бы между сервером и браузером, а секундная точность
     на списке, где строка длится час, не значит ничего. */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  /* Записи и окна в одном ряду, по времени: разделять их значило бы показать
     день дважды. */
  const rows = [
    ...entries.map((entry) => ({ kind: 'booking' as const, at: entry.startsAt, entry })),
    ...gaps.map((gap) => ({ kind: 'gap' as const, at: gap.startsAt, gap })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="day-list">
      {rows.map((row) => {
        if (row.kind === 'gap') {
          const until = new Date(
            new Date(row.gap.startsAt).getTime() + row.gap.minutes * 60_000,
          ).toISOString();
          return (
            <div className="day-list__gap" key={`gap-${row.at}`}>
              <span className="tnum">{formatTime(row.at, locale, timeZone)}</span>
              <span className="t-meta">
                {t.home.freeUntil} {formatTime(until, locale, timeZone)}
              </span>
            </div>
          );
        }

        const entry = row.entry;
        const ends = new Date(new Date(entry.startsAt).getTime() + entry.minutes * 60_000);
        const past = now !== null && ends.getTime() <= now;

        return (
          <Link className={past ? 'day-row is-past' : 'day-row'} href={entry.href} key={entry.id}>
            <span className="col day-row__when">
              <span className="tnum" style={{ fontSize: 14, fontWeight: 600 }}>
                {formatTime(entry.startsAt, locale, timeZone)}
              </span>
              <span className="tnum t-meta" style={{ fontSize: 11.5 }}>
                {duration(entry.minutes, t)}
              </span>
            </span>

            <span className="col day-row__what">
              <span style={{ fontSize: 15, fontWeight: 500 }}>{entry.clientName}</span>
              <span className="t-meta day-row__service">
                <span className="day-row__dot" style={{ background: entry.tone }} />
                {entry.serviceName}
              </span>
            </span>

            {entry.status === 'pending' ? (
              <span className="badge b-amber">
                <span className="dot" />
                {t.bookings.filterNew}
              </span>
            ) : (
              <Icon name="chevR" className="ico-16" />
            )}
          </Link>
        );
      })}

      {rows.length === 0 ? (
        <p className="t-meta" style={{ padding: '18px 20px' }}>
          {t.home.noBookingsToday}
        </p>
      ) : null}
    </div>
  );
}
