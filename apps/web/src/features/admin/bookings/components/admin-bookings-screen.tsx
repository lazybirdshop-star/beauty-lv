'use client';

import { ArrowSquareOut } from '@phosphor-icons/react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';

import {
  AdminExportButton,
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminList } from '../../shared/use-admin-list';
import { listAdminBookings } from '../api';
import type { AdminBooking, BookingStatus } from '../types';

type StatusFilter = 'all' | BookingStatus;

function statusFilters(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'pending', label: t.bookings.filterNew },
    { key: 'confirmed', label: t.bookings.filterConfirmed },
    { key: 'completed', label: t.bookings.filterCompleted },
    { key: 'cancelled_by_client', label: t.bookings.statusCancelledByClient },
  ];
}

function BookingCard({ booking }: { booking: AdminBooking }) {
  const t = useT();
  const locale = useLocale();
  const status = getBookingStatusMeta(t)[booking.status];

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Время визита крупно: разбор жалобы всегда начинается с «когда». */}
          <p className="text-[15px] font-semibold text-ink">
            {formatDateTime(booking.startsAt, locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {booking.guestName ?? t.admin.noName}
            {booking.guestPhone ? ` · ${booking.guestPhone}` : ''}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className="truncate text-sm text-ink-soft">
        {booking.serviceNames.join(', ') || t.admin.noServices} ·{' '}
        {formatPrice(booking.totalAmount, 'EUR', locale)}
      </p>

      <div className="flex items-center justify-between gap-3">
        <a
          href={`/${booking.organizationSlug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-accent"
        >
          <span className="truncate">{booking.organizationName}</span>
          <ArrowSquareOut size={15} weight="bold" className="shrink-0" />
        </a>
        <span className="shrink-0 text-sm text-ink-faint">
          {t.admin.bookedOn} {formatDateTime(booking.createdAt, locale)}
        </span>
      </div>
    </Card>
  );
}

/**
 * Записи всей платформы.
 *
 * Экран для разбора, а не для работы: платформа не подтверждает и не отменяет
 * чужие визиты — это решение мастера, и панель, умеющая его подменять, рано
 * или поздно им воспользуется. Здесь только видно, что происходит.
 */
export function AdminBookingsScreen() {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const list = useAdminList<AdminBooking, { status?: BookingStatus }>({
    key: ['admin-bookings'],
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    fetchPage: listAdminBookings,
  });

  const csv = useAdminExport({
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="grow">
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchBookings}
          />
        </div>
        <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
      </div>
      <AdminFilters options={statusFilters(t)} value={statusFilter} onChange={setStatusFilter} />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
          <AdminListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            loading={list.isLoadingMore}
          />
        </>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noBookings}</Card>
      )}
    </div>
  );
}
