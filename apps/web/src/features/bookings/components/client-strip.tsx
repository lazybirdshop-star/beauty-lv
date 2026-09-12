'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import type { Client } from '@/features/clients/types';
import { initials } from '@/lib/avatar';
import { formatDayMonthShort, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

/**
 * Полоска клиента — кто придёт и что о нём известно (approved N-2).
 *
 * Ниша (`--bg-inset`, радиус 20): портрет 48 инициалами, имя 16/600, «7
 * визитов · последний 12 авг» или «первый визит», флаг, две строки заметки,
 * ссылка «Открыть карточку клиента». Без совпадения в книге — «Нет в вашей
 * базе клиентов» и телефон как есть.
 *
 * `action` — правый верхний слот: «Изменить» в форме записи.
 */
export function ClientStrip({
  slug,
  client,
  name,
  phone,
  action,
}: {
  slug: string;
  client: Client | null;
  /** Имя из записи — когда карточки нет или она ещё не приехала. */
  name: string;
  phone: string | null;
  action?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  const displayName = client?.fullName || name;
  const visits = client?.visitStats.totalBookings ?? 0;
  const forms = {
    zero: t.clients.visitCountZero,
    one: t.clients.visitCountOne,
    few: t.clients.visitCountFew,
    many: t.clients.visitCountMany,
    other: t.clients.visitCountOther,
  };

  let facts: string;
  if (!client) {
    facts = t.bookings.notInBase;
  } else if (visits === 0) {
    facts = t.bookings.firstVisit;
  } else {
    const last = client.visitStats.lastVisitAt
      ? ` · ${fmt(t.clients.lastVisitOn, { date: formatDayMonthShort(new Date(client.visitStats.lastVisitAt), locale, timeZone) })}`
      : '';
    facts = `${visits} ${plural(locale, visits, forms)}${last}`;
  }

  return (
    <div className="client-strip">
      <span className="portrait client-strip__avatar" aria-hidden="true">
        {initials(displayName)}
      </span>
      <div className="client-strip__body">
        <div className="client-strip__head">
          <span className="client-strip__name">{displayName}</span>
          {client ? <ClientFlagBadge flag={client.flag} /> : null}
          {action ? <span className="client-strip__action">{action}</span> : null}
        </div>
        <p className="type-meta">
          {facts}
          {phone ? ` · ${formatPhone(phone)}` : ''}
        </p>
        {client?.notes ? <p className="client-strip__note type-dense">{client.notes}</p> : null}
        {client ? (
          <Link className="link client-strip__link type-meta" href={`/${slug}/dashboard/clients/${client.id}`}>
            {t.bookings.openClient}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
