'use client';

import { useMemo, useState } from 'react';

import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  AdminChip,
  AdminExportButton,
  AdminFilterRow,
  AdminSearch,
  AdminTable,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminPage } from '../../shared/use-admin-page';
import { listAdminBookings } from '../api';
import type {
  AdminBooking,
  AdminBookingsFilters,
  BookingDateFilter,
  BookingOwnerFilter,
  BookingSourceFilter,
  BookingStatus,
} from '../types';

type StatusFilter = 'all' | BookingStatus;

function statusOptions(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'pending', label: t.bookings.filterNew },
    { key: 'confirmed', label: t.bookings.filterConfirmed },
    { key: 'completed', label: t.bookings.filterCompleted },
    { key: 'cancelled_by_client', label: t.bookings.statusCancelledByClient },
  ];
}

function ownerOptions(t: Messages): FilterOption<BookingOwnerFilter>[] {
  return [
    { key: 'all', label: t.admin.ownerAny },
    { key: 'solo', label: t.admin.ownerSolo },
    { key: 'salon', label: t.admin.ownerSalon },
  ];
}

function dateOptions(t: Messages): FilterOption<BookingDateFilter>[] {
  return [
    { key: 'today', label: t.admin.dateToday },
    { key: 'week', label: t.admin.dateWeek },
    { key: 'month', label: t.admin.dateMonth },
    { key: 'all', label: t.admin.dateAll },
  ];
}

function sourceOptions(t: Messages): FilterOption<BookingSourceFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'public_page', label: t.admin.sourcePublicPage },
    { key: 'admin_manual', label: t.admin.sourceAdminManual },
    { key: 'marketplace', label: t.admin.sourceMarketplace },
  ];
}

function sourceLabel(source: AdminBooking['source'], t: Messages): string {
  return {
    public_page: t.admin.sourcePublicPage,
    admin_manual: t.admin.sourceAdminManual,
    marketplace: t.admin.sourceMarketplace,
  }[source];
}

/**
 * Границы окна дат.
 *
 * Считаются в часовом поясе браузера, и это единственный честный вариант:
 * у платформы своего пояса нет, а салоны живут каждый в своём. «Сегодня» здесь
 * значит «сегодня у того, кто смотрит», и никакой другой ответ не был бы
 * вернее — администратор разбирает жалобу своим временем.
 */
function dateWindow(filter: BookingDateFilter): { from?: string; to?: string } {
  if (filter === 'all') return {};

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (filter === 'today') end.setDate(end.getDate() + 1);
  if (filter === 'week') {
    // Неделя начинается в понедельник — как везде в продукте.
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  }
  if (filter === 'month') {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Записи всей платформы — по артборду `AdminBookings.dc.html`.
 *
 * Экран для разбора, а не для работы: платформа не подтверждает и не отменяет
 * чужие визиты — это решение мастера, и панель, умеющая его подменять, рано
 * или поздно им воспользуется. Здесь только видно, что происходит.
 *
 * Порядок — по началу визита вперёд, внутри выбранного окна дат: вопрос на
 * этом экране всегда «что дальше у этого салона», а не «что завелось
 * последним».
 */
export function AdminBookingsScreen() {
  const t = useT();
  const locale = useLocale();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [owner, setOwner] = useState<BookingOwnerFilter>('all');
  const [date, setDate] = useState<BookingDateFilter>('week');
  const [source, setSource] = useState<BookingSourceFilter>('all');

  /* Границы окна пересчитываются при смене отбора, а не на каждый рендер:
     новая строка `from` в ключе запроса означала бы новый запрос на каждое
     нажатие в поле поиска. */
  const window = useMemo(() => dateWindow(date), [date]);

  const filters: AdminBookingsFilters = {
    status: status === 'all' ? undefined : status,
    ownerType: owner === 'all' ? undefined : owner,
    source: source === 'all' ? undefined : source,
    ...window,
  };

  const list = useAdminPage<AdminBooking, AdminBookingsFilters>({
    key: ['admin-bookings'],
    filters,
    fetchPage: listAdminBookings,
    pageSize: 25,
  });

  const csv = useAdminExport({
    filters,
    query: list.query,
    fetchPage: listAdminBookings,
    name: 'amolie-bookings',
    columns: [
      /* Дата сортируемой строкой, а не «13 авг»: по этому столбцу в таблице
         сортируют и считают. */
      {
        header: 'Визит',
        value: (row: AdminBooking) => row.startsAt.slice(0, 16).replace('T', ' '),
      },
      { header: 'Салон', value: (row: AdminBooking) => row.organizationName },
      { header: 'Адрес страницы', value: (row: AdminBooking) => row.organizationSlug },
      { header: 'Гость', value: (row: AdminBooking) => row.guestName },
      { header: 'Телефон', value: (row: AdminBooking) => row.guestPhone },
      { header: 'Услуги', value: (row: AdminBooking) => row.serviceNames.join(', ') },
      /* Сумма числом без знака валюты: так её читает табличный редактор. */
      { header: 'Сумма', value: (row: AdminBooking) => (row.totalAmount / 100).toFixed(2) },
      { header: 'Статус', value: (row: AdminBooking) => row.status },
      { header: 'Источник', value: (row: AdminBooking) => row.source },
    ],
  });

  const statusMeta = getBookingStatusMeta(t);

  return (
    <>
      <PageHeader
        title={t.nav.bookings}
        meta={fmt(t.admin.bookingsMeta, { count: list.total })}
        actions={
          <>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchBookings}
            />
            <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
          </>
        }
      />

      <AdminFilterRow sortedBy={t.admin.sortedByStart}>
        <AdminChip
          label={t.admin.filterOwner}
          value={owner}
          options={ownerOptions(t)}
          onChange={setOwner}
        />
        <AdminChip
          label={t.admin.filterDate}
          value={date}
          options={dateOptions(t)}
          onChange={setDate}
        />
        <AdminChip
          label={t.admin.filterStatus}
          value={status}
          options={statusOptions(t)}
          onChange={setStatus}
        />
        <AdminChip
          label={t.admin.filterSource}
          value={source}
          options={sourceOptions(t)}
          onChange={setSource}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noBookings}
        head={
          <tr>
            <th style={{ width: 150 }}>{t.admin.colStart}</th>
            <th style={{ width: 230 }}>{t.admin.colOwnerColumn}</th>
            <th style={{ width: 170 }}>{t.admin.colClient}</th>
            <th>{t.admin.colService}</th>
            <th style={{ width: 120 }}>{t.admin.colStatus}</th>
            <th style={{ width: 130 }}>{t.admin.colSource}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((booking) => (
          <tr key={booking.id}>
            <td>
              {/* Время визита первым: разбор жалобы всегда начинается с
                  «когда». */}
              <span className="tnum" style={{ fontWeight: 500 }}>
                {formatDateTime(booking.startsAt, locale)}
              </span>
            </td>
            <td>
              <div className="row" style={{ gap: 8 }}>
                <span
                  className="avatar"
                  style={{
                    width: 24,
                    height: 24,
                    fontSize: 9,
                    ...avatarTint(booking.organizationId),
                  }}
                >
                  {initials(booking.organizationName)}
                </span>
                <div className="col" style={{ gap: 0, minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{booking.organizationName}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    /{booking.organizationSlug}
                  </span>
                </div>
              </div>
            </td>
            <td>
              {booking.guestName ?? <span className="t-meta">{t.admin.noName}</span>}
              {booking.guestPhone ? (
                <span className="t-meta" style={{ display: 'block', fontSize: 11.5 }}>
                  {booking.guestPhone}
                </span>
              ) : null}
            </td>
            <td style={{ whiteSpace: 'normal' }}>
              {booking.serviceNames.join(', ') || t.admin.noServices}
              <span className="t-meta" style={{ display: 'block', fontSize: 11.5 }}>
                {formatPrice(booking.totalAmount, 'EUR', locale)}
              </span>
            </td>
            <td>
              <span className={`badge ${badgeClass(statusMeta[booking.status].tone)}`}>
                <span className="dot" />
                {statusMeta[booking.status].label}
              </span>
            </td>
            <td>
              <span className="t-meta">{sourceLabel(booking.source, t)}</span>
            </td>
            <td>
              <RowMenu label={t.admin.rowActions}>
                <a href={`/${booking.organizationSlug}`} target="_blank" rel="noreferrer">
                  {t.admin.openPage}
                </a>
              </RowMenu>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}

/** Тон статуса продукта — в класс значка из набора. */
function badgeClass(tone: string): string {
  return (
    {
      success: 'b-green',
      warning: 'b-amber',
      danger: 'b-red',
      accent: 'b-pink',
      neutral: 'b-neutral',
    }[tone] ?? 'b-neutral'
  );
}
