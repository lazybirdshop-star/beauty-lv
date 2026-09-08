'use client';

import Link from 'next/link';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { avatarTint, initials } from '@/lib/avatar';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { ClientRow } from './clients-table';

/**
 * Клиенты списком — по артборду `ClientsMobile.dc.html`.
 *
 * На телефоне таблица из шести колонок раскладывалась в карточку с подписями
 * («Телефон:», «Последний визит:»), где половину строки занимает слово, а не
 * ответ. В макете это ряд: кружок с инициалами, имя, одна строка про визиты и
 * время ближайшей записи справа.
 *
 * Телефона в ряду нет намеренно: он есть в карточке, а на список смотрят,
 * чтобы найти человека, — по имени.
 */
export function ClientsList({ rows, slug }: { rows: ClientRow[]; slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  const dayFormat = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric', month: 'short' });
  const upcomingFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="clients-list">
      {rows.map(({ client, upcomingAt }) => {
        const visits = client.visitStats.totalBookings;
        const last = client.visitStats.lastVisitAt;

        return (
          <Link
            className="mrow clients-list__row"
            key={client.id}
            href={`/${slug}/dashboard/clients/${client.id}`}
          >
            <span
              className="avatar"
              style={{ width: 38, height: 38, fontSize: 14, ...avatarTint(client.id) }}
            >
              {initials(client.fullName)}
            </span>

            <span className="col" style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <span className="row" style={{ gap: 6, minWidth: 0 }}>
                <span className="clients-list__name">{client.fullName}</span>
                {client.flag ? (
                  <span className={client.flag === 'favourite' ? 'badge b-pink' : 'badge b-amber'}>
                    {client.flag === 'favourite'
                      ? t.clients.flagFavourite
                      : t.clients.flagAttention}
                  </span>
                ) : null}
              </span>
              {/* Одна строка, и в ней только два факта: когда была и сколько
                  раз. Слова «последний визит» здесь лишние — дата на этом
                  месте не может значить ничего другого. */}
              <span className="t-meta clients-list__meta">
                {last ? dayFormat.format(new Date(last)) : t.clients.noVisits}
                {' · '}
                {visits}{' '}
                {plural(locale, visits, {
                  zero: t.clients.visitCountMany,
                  one: t.clients.visitCountOne,
                  few: t.clients.visitCountFew,
                  many: t.clients.visitCountMany,
                  other: t.clients.visitCountMany,
                })}
              </span>
            </span>

            {upcomingAt ? (
              <span className="tnum clients-list__next">
                {upcomingFormat.format(new Date(upcomingAt))}
              </span>
            ) : null}
            <Icon name="chevR" className="ico-16 chev" />
          </Link>
        );
      })}

      {rows.length === 0 ? (
        <p className="t-meta" style={{ padding: '24px 18px', textAlign: 'center' }}>
          {fmt(t.clients.showing, { shown: 0, total: 0 })}
        </p>
      ) : null}
    </div>
  );
}
