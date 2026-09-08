'use client';

import Link from 'next/link';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { avatarTint, initials } from '@/lib/avatar';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { TimelineEntry } from './day-timeline';

/**
 * Ближайший визит карточкой — по артборду `HomeMobile.dc.html`.
 *
 * На телефоне это первое, что мастер видит утром, и единственное, ради чего
 * она открывает кабинет между визитами: кто сейчас придёт, когда и с чем.
 * Телефон клиента здесь же кнопкой — чаще всего карточку открывают, чтобы
 * позвонить и сказать «задерживаюсь на десять минут».
 *
 * На большом экране её нет: там весь день виден линейкой, и вынимать из него
 * одну запись значит показать её дважды.
 */
export function NextVisitCard({
  entry,
  timeZone,
  locale,
  phone,
}: {
  entry: TimelineEntry;
  timeZone: string;
  locale: string;
  phone: string | null;
}) {
  const t = useT();
  const ends = new Date(new Date(entry.startsAt).getTime() + entry.minutes * 60_000).toISOString();

  return (
    <div className="card card-lg next-visit">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="t-label" style={{ color: 'var(--pink-text)' }}>
          {t.home.nextVisit}
        </span>
        <span className="tnum t-meta" style={{ fontSize: 13 }}>
          {formatTime(entry.startsAt, locale, timeZone)} – {formatTime(ends, locale, timeZone)}
        </span>
      </div>

      <div className="row" style={{ gap: 12 }}>
        <span
          className="avatar"
          style={{ width: 40, height: 40, fontSize: 15, ...avatarTint(entry.id) }}
        >
          {initials(entry.clientName)}
        </span>
        <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {entry.clientName}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{entry.serviceName}</span>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        {phone ? (
          <a className="btn btn-secondary btn-lg" style={{ flex: 1 }} href={`tel:${phone}`}>
            <Icon name="phone" className="ico-18" />
            <span>{t.bookings.callClient}</span>
          </a>
        ) : null}
        <Link className="btn btn-secondary btn-lg" style={{ flex: 1 }} href={entry.href}>
          <span>{t.home.visitDetails}</span>
        </Link>
      </div>
    </div>
  );
}

/** Подпись «Следующая · через N мин», когда до визита меньше часа. */
export function nextVisitLabel(minutesLeft: number, t: ReturnType<typeof useT>): string {
  return fmt(t.home.nextIn, { minutes: minutesLeft });
}
