'use client';

/**
 * Таблица клиентов — прототип «Кабинет 2026», `.table.responsive` на экране
 * «Клиенты».
 *
 * Колонки отвечают на то, ради чего адресную книгу открывают: кто, как
 * позвонить, когда был в последний раз, сколько раз всего, когда придёт
 * снова. Метка — последней: она есть у одного клиента из двадцати.
 *
 * Одна таблица на все ширины: на телефоне шапка уходит, строка становится
 * «имя и подстрока слева, метка справа» (`.list-table` в app.css). Прежде
 * телефону рисовался отдельный список с другими строками.
 *
 * Строка открывает карточку нажатием целиком; имя остаётся настоящей
 * ссылкой — её открывают средней кнопкой, копируют и достают с клавиатуры.
 * «Ближайшая» — не поле клиента: считает её экран и передаёт готовой.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, KeyboardEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { formatDayShort, formatPhone, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { Client } from '../types';

export interface ClientRow {
  client: Client;
  /** Ближайшая будущая запись, ISO. Пусто — прочерк. */
  upcomingAt: string | null;
}

/* Меню строки — про строку, а не про переход в карточку. */
const keep = (event: MouseEvent | KeyboardEvent) => event.stopPropagation();

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
  const router = useRouter();

  if (rows.length === 0) {
    return <EmptyState title={t.clients.emptyTitle} hint={t.clients.emptyHint} />;
  }

  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

  /* Колонка меток — только когда метка есть хоть у кого-то: пустая колонка
     обещает данные, которых нет. */
  const anyFlags = rows.some(({ client }) => client.isBlocked || client.flag);

  /* Метки — только те, что поставил человек: «Любимый», «Осторожно»,
     блокировка. «Новый» ушёл вместе с прототипом «Кабинет 2026»: число
     визитов стоит в соседней колонке, и метка его повторяла. */
  const flagOf = (client: Client) =>
    client.isBlocked ? (
      <Badge tone="danger">{t.clients.blocked}</Badge>
    ) : client.flag === 'attention' ? (
      <Badge tone="warning">{t.clients.flagAttention}</Badge>
    ) : client.flag === 'favourite' ? (
      <Badge tone="accent">{t.clients.flagFavourite}</Badge>
    ) : null;

  /* «29 авг», «сегодня 14:30», «15 сен 11:00» — даты прототипа без точек. */
  const day = (iso: string) =>
    dayOf(iso) === todayKey ? t.workspace.todayMark : formatDayShort(iso, locale, timeZone, false);

  return (
    <div className="list-table-wrap">
      <table className="list-table">
        <thead>
          <tr>
            <th>{t.clients.colClient}</th>
            <th>{t.clients.colPhone}</th>
            <th>{t.clients.colLastVisit}</th>
            <th className="r">{t.clients.colVisits}</th>
            <th>{t.clients.colUpcoming}</th>
            {anyFlags ? <th>{t.clients.colFlags}</th> : null}
            <th className="list-table__menu" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ client, upcomingAt }) => {
            const href = `/${slug}/dashboard/clients/${client.id}`;
            const visits = client.visitStats.totalBookings;
            const last = client.visitStats.lastVisitAt;

            return (
              <tr key={client.id} className="is-click" onClick={() => router.push(href)}>
                <td>
                  <span className="cellname">
                    <span className="list-avatar" style={avatarTint(client.id)} aria-hidden="true">
                      {initials(client.fullName)}
                    </span>
                    <span className="cellname__text">
                      <Link className="cellname__title" href={href} onClick={keep}>
                        {client.fullName}
                      </Link>
                      {/* На телефоне колонок нет — два факта уходят под имя. */}
                      <small className="m-only tnum">
                        {formatPhone(client.phone)} · {visits}{' '}
                        {plural(locale, visits, {
                          zero: t.clients.visitCountMany,
                          one: t.clients.visitCountOne,
                          few: t.clients.visitCountFew,
                          many: t.clients.visitCountMany,
                          other: t.clients.visitCountMany,
                        })}
                      </small>
                    </span>
                  </span>
                </td>
                <td className="hide-m tnum">{formatPhone(client.phone)}</td>
                <td className="hide-m">
                  {last ? (
                    day(last)
                  ) : (
                    <span className="list-table__none">{t.clients.neverVisited}</span>
                  )}
                </td>
                <td className="hide-m r">{visits}</td>
                <td className="hide-m">
                  {upcomingAt
                    ? `${day(upcomingAt)} ${formatTime(upcomingAt, locale, timeZone)}`
                    : '—'}
                </td>
                {anyFlags ? <td className="m-right">{flagOf(client)}</td> : null}
                <td className="hide-m list-table__menu" onClick={keep} onKeyDown={keep}>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
