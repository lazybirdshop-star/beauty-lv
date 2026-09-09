'use client';

/**
 * Карточка «Сегодня» — по артборду `Main.dc.html`.
 *
 * День нарисован линейкой, а не списком: у списка все записи одинаковой
 * высоты, и полуторачасовой визит выглядит как получасовой. Здесь минута
 * равна пикселю, поэтому «свободно с 12 до 13» видно, не читая ни строчки.
 *
 * Три состояния карточки, и все три из макета: прошедшая приглушена, ближайшая
 * поднята тенью и подписана «Следующая · через N мин», остальные обычные.
 * Розовая черта — сейчас; она же единственное, что на этом экране движется.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import type { Booking } from '@/features/bookings/types';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';

/** Высота часа. 60px — час из макета, то есть ровно пиксель на минуту. */
const HOUR = 60;
/** Минимальная высота карточки: строка имени, поля и рамка. */
const MIN_CARD = 31;
/** Сколько ещё нужно, чтобы под именем поместилась строка про услугу. */
const META_LINE = 19;
/** Поля дня: линейка начинается на час раньше первой записи и кончается часом позже. */
const PAD_MINUTES = 60;

export interface TimelineEntry {
  id: string;
  /** Момент начала визита, ISO. */
  startsAt: string;
  minutes: number;
  clientName: string;
  serviceName: string;
  /** Цвет метки услуги — он же в календаре и в списке записей. */
  tone: string;
  status: Booking['status'];
  href: string;
}

/** Пустое окно между записями — то, куда клиент ещё может встать. */
export interface TimelineGap {
  startsAt: string;
  minutes: number;
}

function minutesOfDay(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Подпись длительности: «1 ч 30 мин» без нулевых частей. */
function duration(minutes: number, t: Messages): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ${t.common.hourShort} ${m} ${t.common.minuteShort}`;
  if (h) return `${h} ${t.common.hourShort}`;
  return `${m} ${t.common.minuteShort}`;
}

export function DayTimeline({
  entries,
  gaps,
  timeZone,
  locale,
  calendarHref,
}: {
  entries: TimelineEntry[];
  gaps: TimelineGap[];
  timeZone: string;
  locale: string;
  calendarHref: string;
}) {
  const t = useT();

  /* Черта «сейчас» — единственное, что здесь тикает. Раз в минуту: секундная
     точность на шкале, где минута равна пикселю, не значит ничего, а перерисовка
     раз в секунду значит разбуженный процессор на весь рабочий день. */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(minutesOfDay(new Date().toISOString(), timeZone));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);

  const day = useMemo(() => {
    const starts = entries.map((e) => minutesOfDay(e.startsAt, timeZone));
    const ends = entries.map((e, i) => starts[i]! + e.minutes);
    const gapStarts = gaps.map((g) => minutesOfDay(g.startsAt, timeZone));
    const gapEnds = gaps.map((g, i) => gapStarts[i]! + g.minutes);

    const all = [...starts, ...gapStarts];
    const allEnds = [...ends, ...gapEnds];
    /* День без записей всё равно показывает рабочее окно: пустая линейка
       без делений читалась бы как поломка, а не как свободный день. */
    const from = all.length ? Math.min(...all) - PAD_MINUTES : 9 * 60;
    const to = allEnds.length ? Math.max(...allEnds) + PAD_MINUTES : 19 * 60;

    const start = Math.floor(from / 60) * 60;
    const end = Math.ceil(to / 60) * 60;

    return {
      start,
      end,
      hours: Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60),
      placed: entries.map((entry, i) => ({ entry, top: starts[i]! - start, at: starts[i]! })),
      gaps: gaps.map((gap, i) => ({ gap, top: gapStarts[i]! - start })),
    };
  }, [entries, gaps, timeZone]);

  /* «Следующая» — первая ещё не начавшаяся запись дня. Пока часы не пошли
     (первый кадр на сервере), выделенной нет: подсветить не ту хуже, чем
     не подсветить ни одной. */
  const nextIndex = now === null ? -1 : day.placed.findIndex((p) => p.at + p.entry.minutes > now);
  const remaining =
    now === null ? entries.length : Math.max(0, day.placed.length - Math.max(nextIndex, 0));
  const nextIn = nextIndex >= 0 && now !== null ? day.placed[nextIndex]!.at - now : null;

  return (
    <section className="card" style={{ padding: '16px 18px 18px', overflow: 'hidden' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="t-section">{t.home.today}</span>
          <span className="t-meta">
            {fmt(t.home.todayRemaining, { count: remaining })}
            {nextIn !== null && nextIn > 0
              ? ` · ${fmt(t.home.nextIn, { duration: duration(nextIn, t) })}`
              : ''}
          </span>
        </div>
        <Link className="btn btn-ghost btn-sm" href={calendarHref}>
          <Icon name="calendar" className="ico-18" />
          <span>{t.home.openCalendar}</span>
        </Link>
      </div>

      <div
        style={{
          position: 'relative',
          height: day.end - day.start,
          marginTop: 10,
          minWidth: 0,
        }}
      >
        {day.hours.map((hour) => (
          <div
            key={hour}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: hour - day.start,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span
              className="tnum"
              style={{
                width: 52,
                fontSize: 12,
                color: 'var(--muted)',
                marginTop: -8,
                textAlign: 'right',
                paddingRight: 10,
              }}
            >
              {clock(hour)}
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          </div>
        ))}

        {day.gaps.map(({ gap, top }) => (
          <div
            key={gap.startsAt}
            style={{
              position: 'absolute',
              left: 52,
              right: 0,
              top,
              height: gap.minutes - 2,
              borderRadius: 8,
              background:
                'repeating-linear-gradient(-45deg,var(--subtle) 0 6px,transparent 6px 12px)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
            }}
          >
            <span className="t-meta" style={{ fontSize: 12 }}>
              {fmt(t.home.freeWindow, { time: clock(minutesOfDay(gap.startsAt, timeZone)) })}
            </span>
          </div>
        ))}

        {day.placed.map(({ entry, top, at }, index) => {
          const past = now !== null && at + entry.minutes <= now;
          const next = index === nextIndex;
          const range = `${formatTime(entry.startsAt, locale, timeZone)}–${clock(at + entry.minutes)}`;
          /*
           * Минута равна пикселю, поэтому двадцатиминутный визит получал
           * карточку в семнадцать пикселей: имя резалось по середине букв, а
           * соседняя карточка накрывала её сверху. Минимум — строка имени
           * (19px) плюс поля и рамка; вторая строка появляется, когда для неё
           * есть место, а не режется пополам.
           */
          const height = Math.max(MIN_CARD, entry.minutes - 3);
          const roomy = height >= MIN_CARD + META_LINE;

          return (
            <Link
              key={entry.id}
              href={entry.href}
              style={{
                position: 'absolute',
                left: 52,
                right: 0,
                top,
                height,
                borderRadius: 10,
                background: 'var(--white)',
                border: `1px solid ${next ? 'var(--hair-strong)' : 'var(--hair)'}`,
                boxShadow: next ? 'var(--shadow-2)' : 'var(--shadow-1)',
                display: 'flex',
                gap: 12,
                padding: next ? '10px 14px' : roomy ? '7px 12px' : '5px 12px',
                opacity: past ? 0.55 : 1,
                overflow: 'hidden',
                color: 'var(--ink)',
              }}
            >
              <div className="col" style={{ gap: next ? 2 : 1, minWidth: 0, flex: 1 }}>
                {next ? (
                  <>
                    <div
                      className="row"
                      style={{ gap: 8, justifyContent: 'space-between', flex: 'none', height: 18 }}
                    >
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>
                        {range}
                      </span>
                      {nextIn !== null && nextIn > 0 ? (
                        <span className="badge b-pink" style={{ height: 22 }}>
                          {fmt(t.home.nextBadge, { duration: duration(nextIn, t) })}
                        </span>
                      ) : null}
                    </div>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: '-0.005em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 'none',
                        height: 22,
                        lineHeight: '22px',
                      }}
                    >
                      {entry.clientName}
                    </span>
                    <span
                      className="t-meta"
                      style={{
                        fontSize: 13,
                        flex: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Dot tone={entry.tone} />
                      {entry.serviceName} · {duration(entry.minutes, t)}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      className="row"
                      style={{
                        justifyContent: 'space-between',
                        gap: 8,
                        flex: 'none',
                        height: 19,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14.5,
                          fontWeight: 600,
                          letterSpacing: '-0.005em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.clientName}
                      </span>
                      <span
                        className="tnum"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: 'var(--ink-2)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {range}
                      </span>
                    </div>
                    {/* Вторая строка — по месту в карточке, а не по длине
                        визита: минимальная высота эти два числа развела. */}
                    {roomy ? (
                      <div
                        className="row"
                        style={{
                          justifyContent: 'space-between',
                          gap: 8,
                          flex: 'none',
                          height: 18,
                        }}
                      >
                        <span
                          className="t-meta"
                          style={{
                            fontSize: 12.5,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <Dot tone={entry.tone} />
                          {entry.serviceName} · {duration(entry.minutes, t)}
                        </span>
                        {past ? (
                          <span className="t-meta" style={{ fontSize: 12 }}>
                            {t.home.done}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </Link>
          );
        })}

        {now !== null && now > day.start && now < day.end ? (
          <div
            style={{
              position: 'absolute',
              left: 48,
              right: 0,
              top: now - day.start,
              height: 2,
              background: 'var(--pink)',
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--pink)',
              }}
            />
            <span
              className="tnum"
              style={{
                position: 'absolute',
                left: -46,
                top: -9,
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                background: 'var(--pink)',
                borderRadius: 5,
                padding: '2px 5px',
                lineHeight: 1.2,
              }}
            >
              {clock(now)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Dot({ tone }: { tone: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: tone,
        marginRight: 6,
        verticalAlign: 1,
      }}
    />
  );
}

export { HOUR, minutesOfDay, clock };
