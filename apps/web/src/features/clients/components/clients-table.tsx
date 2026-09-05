'use client';

/**
 * Таблица клиентов — по артборду `Clients.dc.html`.
 *
 * Колонки отвечают на то, ради чего адресную книгу открывают: кто, как
 * позвонить, когда был в последний раз, сколько раз всего, когда придёт
 * снова. Метка — последней: она есть у одного клиента из двадцати, и колонка,
 * пустая в девятнадцати строках, не имеет права стоять раньше телефона.
 *
 * «Ближайшая» — не поле клиента, а ближайшая его будущая запись; считает её
 * экран и передаёт сюда готовой: таблица не ходит за данными.
 */
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import type { Client } from '../types';
import { initials } from '@/lib/avatar';
import Link from 'next/link';

export interface ClientRow {
  client: Client;
  /** Ближайшая будущая запись, ISO. Пусто — прочерк, как в макете. */
  upcomingAt: string | null;
}

export function ClientsTable({
  rows,
  slug,
  onEdit,
  onDelete,
  todayKey,
}: {
  rows: ClientRow[];
  /** Адрес кабинета — из него собирается ссылка на карточку клиента. */
  slug: string;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  todayKey: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  const dayFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: 'numeric',
    month: 'short',
  });
  const upcomingFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

  return (
    <div className="card bookings-table">
      <table className="table">
        <thead>
          <tr>
            <th>{t.clients.colClient}</th>
            <th style={{ width: 170 }}>{t.clients.colPhone}</th>
            <th style={{ width: 110 }}>{t.clients.colLastVisit}</th>
            <th style={{ width: 80 }} className="num">
              {t.clients.colVisits}
            </th>
            <th style={{ width: 150 }}>{t.clients.colUpcoming}</th>
            <th style={{ width: 130 }}>{t.clients.colFlags}</th>
            <th style={{ width: 48 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ client, upcomingAt }) => (
            <tr key={client.id}>
              <td data-label="">
                {/* Имя — настоящая ссылка, а не строка с обработчиком нажатия:
                    карточка стала страницей, и её адрес должен открываться
                    средней кнопкой, копироваться и попадать в закладки. */}
                <Link
                  className="row client-row__name"
                  style={{ gap: 10 }}
                  href={`/${slug}/dashboard/clients/${client.id}`}
                >
                  <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                    {initials(client.fullName)}
                  </span>
                  <span style={{ fontWeight: 500 }}>{client.fullName}</span>
                </Link>
              </td>
              <td className="tnum" data-label={t.clients.colPhone}>
                {formatPhone(client.phone)}
              </td>
              <td data-label={t.clients.colLastVisit}>
                {client.visitStats.lastVisitAt
                  ? dayOf(client.visitStats.lastVisitAt) === todayKey
                    ? t.bookings.today
                    : dayFormat.format(new Date(client.visitStats.lastVisitAt))
                  : '—'}
              </td>
              <td className="num" data-label={t.clients.colVisits}>
                {client.visitStats.totalBookings}
              </td>
              <td data-label={t.clients.colUpcoming}>
                {upcomingAt
                  ? dayOf(upcomingAt) === todayKey
                    ? `${t.bookings.today} · ${timeFormat.format(new Date(upcomingAt))}`
                    : upcomingFormat.format(new Date(upcomingAt))
                  : '—'}
              </td>
              <td data-label="">
                {client.isBlocked ? (
                  <span className="badge b-red">
                    <span className="dot" />
                    {t.clients.blocked}
                  </span>
                ) : client.flag === 'attention' ? (
                  <span className="badge b-amber">
                    <span className="dot" />
                    {t.clients.flagAttention}
                  </span>
                ) : client.flag === 'favourite' ? (
                  <span className="badge b-lilac">
                    <span className="dot" />
                    {t.clients.flagFavourite}
                  </span>
                ) : client.visitStats.totalBookings <= 1 ? (
                  <span className="badge b-neutral">{t.clients.newClient}</span>
                ) : null}
              </td>
              {/* Меню не открывает карточку: нажатие по нему — про строку, а
                  не про переход, и всплытие пришлось бы гасить у каждого
                  пункта отдельно. */}
              <td
                data-label=""
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <RowMenu label={client.fullName}>
                  <button type="button" onClick={() => onEdit(client)}>
                    <Icon name="edit" className="ico-16" />
                    <span>{t.common.edit}</span>
                  </button>
                  <button type="button" className="is-danger" onClick={() => onDelete(client)}>
                    <Icon name="trash" className="ico-16" />
                    <span>{t.common.delete}</span>
                  </button>
                </RowMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <div className="bookings-empty">
          <Icon name="clients" className="ico-24" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t.clients.emptyTitle}</span>
          <span className="t-meta" style={{ maxWidth: 300, textAlign: 'center' }}>
            {t.clients.emptyHint}
          </span>
        </div>
      ) : null}
    </div>
  );
}
