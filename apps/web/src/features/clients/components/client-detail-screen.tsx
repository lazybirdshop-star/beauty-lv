'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPhone, formatPrice } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { createBooking } from '../../bookings/api';
import { NewBookingSheet } from '../../bookings/components/new-booking-sheet';
import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { getClient, listClientBookings, setClientBlocked, updateClient } from '../api';
import { getClientVisitStats } from '../visit-stats';
import type { Client, ClientFormValues } from '../types';
import { ClientFormSheet } from './client-form-sheet';

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

/** Плитка обзора: подпись, число и при необходимости уточнение под ним. */
function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="client-tile">
      <span className="t-meta" style={{ fontSize: 12.5 }}>
        {label}
      </span>
      <span className="client-tile__value tnum">{value}</span>
      {hint ? (
        <span className="t-meta" style={{ fontSize: 12 }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Ближайшая будущая запись из истории.
 *
 * Вынесена из компонента: `Date.now()` во время отрисовки делает результат
 * непредсказуемым при каждом повторном проходе. Здесь часы спрашиваются один
 * раз на вызов, и вызов происходит вместе с расчётом остального.
 */
function upcomingOf(history: Booking[]): Booking | undefined {
  const now = Date.now();
  return history
    .filter(
      (item) =>
        new Date(item.startsAt).getTime() >= now &&
        item.status !== 'cancelled_by_client' &&
        item.status !== 'cancelled_by_master',
    )
    .at(-1);
}

/** Длительность визита словами — «1 ч 30 мин». */
function duration(booking: Booking, t: Messages): string {
  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [
    hours ? `${hours} ${t.common.hourShort}` : '',
    rest ? `${rest} ${t.common.minuteShort}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function total(booking: Booking): number {
  return booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
}

/**
 * Карточка клиента — по артборду `ClientDetail.dc.html`.
 *
 * Страницей, а не шторкой: у карточки есть адрес, на неё ведут ссылки из
 * таблицы и из записи, и она переживает перезагрузку. Шторка всё это теряла —
 * закрыть её случайным нажатием мимо было проще, чем открыть.
 *
 * Слева ближайшая запись и вся история визитов, справа — четыре числа обзора,
 * заметка и метка. Порядок тот же, в каком мастер про человека вспоминает:
 * «когда придёт → что было → сколько раз → что я о ней помню».
 */
export function ClientDetailScreen({ slug, clientId }: { slug: string; clientId: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);

  const clientQuery = useQuery({
    queryKey: ['client', slug, clientId],
    queryFn: () => getClient(slug, clientId),
  });

  const historyQuery = useQuery({
    queryKey: ['client-bookings', slug, clientId],
    queryFn: () => listClientBookings(slug, clientId),
  });

  /* Окна и услуги нужны только когда форму открыли: карточку открывают, чтобы
     посмотреть историю, и платить за это двумя лишними запросами не должен
     никто. */
  const slotsQuery = useQuery({
    queryKey: ['published-slots', slug],
    queryFn: () => listSlots(slug),
    enabled: booking,
  });
  const servicesQuery = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
    enabled: booking,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['client', slug, clientId] });
    void queryClient.invalidateQueries({ queryKey: ['client-bookings', slug, clientId] });
    void queryClient.invalidateQueries({ queryKey: ['clients', slug] });
  };

  const blockMutation = useMutation({
    mutationFn: (next: boolean) => setClientBlocked(slug, clientId, next),
    onSuccess: invalidate,
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ClientFormValues) => updateClient(slug, clientId, values),
    onSuccess: () => {
      setEditing(false);
      invalidate();
      toast({ message: t.bookings.editSaved });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: () => {
      setBooking(false);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['bookings', slug] });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (clientQuery.isError) return <LoadError onRetry={() => void clientQuery.refetch()} />;
  if (clientQuery.isPending || !clientQuery.data) return <Skeleton className="h-96 w-full" />;

  const client: Client = clientQuery.data;
  const history = historyQuery.data ?? [];
  const stats = getClientVisitStats(client.visitStats, history);
  const statusMeta = getBookingStatusMeta(t);

  /*
   * Ближайшая — первая будущая из неотменённых. История приходит новыми
   * вперёд, поэтому берётся последняя подходящая: ближайшая к «сейчас».
   *
   * «Сейчас» берётся один раз за загрузку истории, а не на каждую отрисовку:
   * часы во время отрисовки — источник расхождений между тем, что React
   * посчитал на сервере, и тем, что он пересчитает в браузере.
   */
  const upcoming = upcomingOf(history);

  /* Год печатается только у прошлогодних визитов: «16 сент. 2026 г.» в
     каждой строке истории — это три лишних слова про то, что и так сегодня. */
  const thisYear = new Date().getFullYear();
  const date = (iso: string) => {
    const value = new Date(iso);
    return value.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: value.getFullYear() === thisYear ? undefined : 'numeric',
      timeZone,
    });
  };
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone });

  return (
    <>
      <nav className="row master-crumbs" aria-label={t.clients.breadcrumb}>
        <Link href={`/${slug}/dashboard/clients`}>{t.clients.breadcrumb}</Link>
        <Icon name="chevR" className="ico-16" />
        <span style={{ color: 'var(--ink)' }}>{client.fullName}</span>
      </nav>

      <header className="master-head" style={{ paddingBottom: 22 }}>
        <span
          className="avatar"
          style={{ width: 56, height: 56, fontSize: 21, ...avatarTint(client.id) }}
        >
          {initials(client.fullName)}
        </span>

        <div className="col" style={{ gap: 3, flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h1 className="t-page">{client.fullName}</h1>
            {client.isBlocked ? (
              <span className="badge b-red">
                <span className="dot" />
                {t.clients.blocked}
              </span>
            ) : null}
          </div>
          <div className="row master-head__meta" style={{ fontSize: 14 }}>
            <span className="row" style={{ gap: 6 }}>
              <Icon name="phone" className="ico-16" />
              <a className="tnum" href={`tel:${client.phone}`}>
                {formatPhone(client.phone)}
              </a>
            </span>
            {client.email ? (
              <span className="row" style={{ gap: 6 }}>
                <Icon name="mail" className="ico-16" />
                <a href={`mailto:${client.email}`}>{client.email}</a>
              </span>
            ) : null}
            <span>{fmt(t.clients.clientSince, { date: date(client.createdAt) })}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Icon name="edit" className="ico-18" />
            <span>{t.common.edit}</span>
          </button>
          <RowMenu label={t.admin.rowActions}>
            <button
              type="button"
              disabled={blockMutation.isPending}
              onClick={() => blockMutation.mutate(!client.isBlocked)}
            >
              {client.isBlocked ? t.clients.unblock : t.clients.block}
            </button>
          </RowMenu>
          <button type="button" className="btn btn-primary" onClick={() => setBooking(true)}>
            <Icon name="calendarPlus" className="ico-18" />
            <span>{t.clients.newBooking}</span>
          </button>
        </div>
      </header>

      <div className="client-grid">
        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.clients.upcoming}
              </span>
              {upcoming ? (
                <Link
                  className="btn btn-ghost btn-sm"
                  href={`/${slug}/dashboard/bookings?booking=${upcoming.id}`}
                >
                  <Icon name="clock" className="ico-18" />
                  <span>{t.clients.reschedule}</span>
                </Link>
              ) : null}
            </div>

            {upcoming ? (
              <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
                <div className="col" style={{ width: 84 }}>
                  <span
                    className="tnum"
                    style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}
                  >
                    {time(upcoming.startsAt)}
                  </span>
                  <span className="t-meta">{date(upcoming.startsAt)}</span>
                </div>
                <div className="col" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {upcoming.items.map((item) => item.serviceNameSnapshot).join(' + ')}
                  </span>
                  <span className="t-meta">
                    {duration(upcoming, t)} · {formatPrice(total(upcoming), 'EUR', locale)}
                  </span>
                </div>
                <span className={`badge ${badgeClass(statusMeta[upcoming.status].tone)}`}>
                  <span className="dot" />
                  {statusMeta[upcoming.status].label}
                </span>
              </div>
            ) : (
              <p className="t-meta">{t.clients.noUpcoming}</p>
            )}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div
              className="row"
              style={{ justifyContent: 'space-between', padding: '14px 18px 10px' }}
            >
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.clients.historyTitle}
              </span>
              <span className="t-meta">
                {fmt(t.clients.historyCount, { count: history.length })}
              </span>
            </div>

            {historyQuery.isPending ? (
              <Skeleton className="mx-4 mb-4 h-24" />
            ) : history.length === 0 ? (
              <p className="t-meta" style={{ padding: '0 18px 22px' }}>
                {t.clients.historyEmpty}
              </p>
            ) : (
              <div className="admin-table client-history">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>{t.clients.colDate}</th>
                      <th style={{ width: 80 }}>{t.clients.colTime}</th>
                      <th>{t.clients.colService}</th>
                      <th style={{ width: 110 }}>{t.clients.colDuration}</th>
                      <th className="num" style={{ width: 90 }}>
                        {t.clients.colPrice}
                      </th>
                      <th style={{ width: 130 }}>{t.clients.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>{date(item.startsAt)}</td>
                        <td>
                          <span className="tnum">{time(item.startsAt)}</span>
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          {item.items.map((line) => line.serviceNameSnapshot).join(' + ')}
                        </td>
                        <td>{duration(item, t)}</td>
                        <td className="num">
                          <span className="tnum">{formatPrice(total(item), 'EUR', locale)}</span>
                        </td>
                        <td>
                          <span className={`badge ${badgeClass(statusMeta[item.status].tone)}`}>
                            <span className="dot" />
                            {statusMeta[item.status].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <span
              className="t-section"
              style={{ fontSize: 15, display: 'block', marginBottom: 10 }}
            >
              {t.clients.overview}
            </span>
            <div className="client-tiles">
              <Tile label={t.clients.completedVisits} value={String(stats.completedCount)} />
              <Tile
                label={t.clients.lastVisit}
                value={stats.lastVisitAt ? date(stats.lastVisitAt) : '—'}
              />
              <Tile
                label={t.clients.spent}
                value={formatPrice(stats.spentAmount, 'EUR', locale)}
                hint={t.clients.spentHint}
              />
              <Tile
                label={t.clients.cancelledCount}
                value={String(stats.cancelledCount)}
                hint={fmt(t.clients.noShowHint, { count: stats.noShowCount })}
              />
            </div>
            {stats.favoriteServiceName ? (
              <p className="t-meta" style={{ marginTop: 10 }}>
                {t.clients.favouriteService}: {stats.favoriteServiceName}
              </p>
            ) : null}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.clients.notes}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(true)}
              >
                <span>{t.clients.editNotes}</span>
              </button>
            </div>
            {client.notes ? (
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {client.notes}
              </p>
            ) : (
              <p className="t-meta" style={{ fontSize: 13.5 }}>
                {t.clients.notesEmpty}
              </p>
            )}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.clients.flags}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(true)}
              >
                <Icon name="flag" className="ico-18" />
                <span>{t.common.edit}</span>
              </button>
            </div>
            {client.flag ? (
              <span className={client.flag === 'favourite' ? 'badge b-pink' : 'badge b-amber'}>
                {client.flag === 'favourite' ? t.clients.flagFavourite : t.clients.flagAttention}
              </span>
            ) : (
              <p className="t-meta" style={{ fontSize: 13.5 }}>
                {t.clients.flagsEmpty}
              </p>
            )}
          </div>
        </aside>
      </div>

      <ClientFormSheet
        open={editing}
        onOpenChange={setEditing}
        client={client}
        submitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutateAsync(values).then(() => undefined)}
      />

      <NewBookingSheet
        open={booking}
        onOpenChange={setBooking}
        availableSlots={slotsQuery.data ?? []}
        services={servicesQuery.data ?? []}
        submitting={createMutation.isPending}
        guest={{ name: client.fullName, phone: client.phone }}
        onSubmit={(input) => createMutation.mutateAsync(input).then(() => undefined)}
      />
    </>
  );
}
