'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDayShort, formatDuration, formatPhone, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useNow } from '@/lib/use-now';

import { createBooking } from '../../bookings/api';
import { NewBookingSheet } from '../../bookings/components/new-booking-sheet';
import { VisitRow } from '../../bookings/components/visit-row';
import { smsLink, telLink, whatsAppLink } from '../../bookings/contact-links';
import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { getClient, listClientBookings, setClientBlocked, updateClient } from '../api';
import type { Client, ClientFormValues } from '../types';
import { getClientVisitStats, splitClientHistory } from '../visit-stats';
import { ClientFormSheet } from './client-form-sheet';

/** Сколько визитов показывает карточка до нажатия «показать ещё». */
const VISITS_PAGE = 10;

const minutesOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;

const totalOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);

const currencyOf = (booking: Booking) => booking.items[0]?.priceCurrencySnapshot ?? 'EUR';

/**
 * Карточка клиента — прототип «Кабинет 2026», экран `client`.
 *
 * Страницей, а не шторкой: у карточки есть адрес, на неё ведут ссылки из
 * списка и из записи, и она переживает перезагрузку.
 *
 * Слева — кто это: портрет, имя, метки, телефон, почта, любимая услуга и
 * «Позвонить · WhatsApp · SMS». Справа — сколько раз был, сколько оставил
 * (чернильная плитка — главное число карточки), сколько отменил, и заметка.
 * Ниже — ближайшая запись в розовой ячейке и все визиты. Блокировка — в меню
 * «Ещё» с подтверждением: действие редкое и видимое клиенту.
 */
export function ClientDetailScreen({ slug, clientId }: { slug: string; clientId: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const now = useNow();
  const workspace = useWorkspace();
  /* Состав — форме записи и строкам «Предстоящих»: у салона строка называет
     мастера визита. */
  const teamView = Boolean(workspace?.capabilities.canViewTeamCalendar);
  const roster = useTeamRoster(slug, teamView);
  const memberOf = (id: string) =>
    roster.data?.find((member) => member.id === id)?.name.split(' ')[0];

  const clientQuery = useQuery({
    queryKey: ['client', slug, clientId],
    queryFn: () => getClient(slug, clientId),
  });

  const historyQuery = useQuery({
    queryKey: ['client-bookings', slug, clientId],
    queryFn: () => listClientBookings(slug, clientId),
  });

  /* Окна и услуги нужны только когда форму записи открыли. */
  const slotsQuery = useQuery({
    queryKey: ['slots', slug, 'all'],
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
    onSuccess: () => {
      setConfirmBlock(false);
      invalidate();
    },
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

  /* Визиты порциями по десять: у постоянной клиентки второго года это сотня
     строк, и одним куском они уводят всё остальное за сгиб. */
  const [visitsShown, setVisitsShown] = useState(VISITS_PAGE);

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
  /* Данные клиента грузятся только в браузере, где часы уже известны; до
     этого истории нет вовсе, и делить нечего. */
  const { upcoming, past } = splitClientHistory(history, now ?? Number.POSITIVE_INFINITY);

  /* «Клиент с» — с первого визита, если он раньше карточки: карточку
     заводят и после того, как человек уже приходил, и «с 14 сен» над
     визитом 11 сен читалось ошибкой. */
  const since = history.reduce(
    (earliest, item) => (item.startsAt < earliest ? item.startsAt : earliest),
    client.createdAt,
  );

  const visits = past.slice(0, visitsShown);
  const visitsLeft = past.length - visits.length;

  /* «29 авг» — три буквы месяца без точки, как в прототипе; год печатается
     только у прошлогодних визитов. */
  const thisYear = new Date().getFullYear();
  const date = (iso: string) => {
    const year = new Date(iso).getFullYear();
    const day = formatDayShort(iso, locale, timeZone, false);
    return year === thisYear ? day : `${day} ${year}`;
  };
  /* Через общий форматтер: у английской локали `Intl` выбрал бы «04:00 PM». */
  const time = (iso: string) => formatTime(iso, locale, timeZone);
  const duration = (booking: Booking) =>
    formatDuration(minutesOf(booking), {
      hoursShort: t.common.hoursShort,
      minutesShort: t.common.minutesShort,
    });
  const bookingHref = (id: string) => `/${slug}/dashboard/bookings?booking=${id}`;

  return (
    <>
      {/* Имя здесь не повторяется: оно уже заголовок страницы и карточки. */}
      <nav className="row master-crumbs" aria-label={t.clients.breadcrumb}>
        <Link href={`/${slug}/dashboard/clients`}>{t.clients.breadcrumb}</Link>
      </nav>

      <PageHeader
        back={{ href: `/${slug}/dashboard/clients`, label: t.clients.breadcrumb }}
        title={client.fullName}
        actions={
          <>
            <RowMenu label={t.nav.more}>
              <button type="button" onClick={() => setEditing(true)}>
                <Icon name="edit" className="ico-16" />
                <span>{t.clients.editClient}</span>
              </button>
              {client.isBlocked ? (
                <button
                  type="button"
                  disabled={blockMutation.isPending}
                  onClick={() => blockMutation.mutate(false)}
                >
                  <span>{t.clients.unblock}</span>
                </button>
              ) : (
                <button type="button" className="is-danger" onClick={() => setConfirmBlock(true)}>
                  <span>{t.clients.block}</span>
                </button>
              )}
            </RowMenu>
            <Button size="sm" onClick={() => setBooking(true)}>
              <Icon name="plus" className="ico-18" />
              <span>{t.clients.newBooking}</span>
            </Button>
          </>
        }
      />

      <div className="person-grid">
        <Card className="person-grid__profile">
          <div className="person-card__head">
            <span className="person-card__avatar" style={avatarTint(client.id)} aria-hidden="true">
              {initials(client.fullName)}
            </span>
            <div className="person-card__titles">
              {/* Имя — заголовок страницы; в карточке его второй раз нет. */}
              <p className="person-card__since">
                {fmt(t.clients.clientSince, { date: date(since) })}
              </p>
              <div className="person-card__flags">
                {client.isBlocked ? <Badge tone="danger">{t.clients.blocked}</Badge> : null}
                {client.flag === 'favourite' ? (
                  <Badge tone="accent">{t.clients.flagFavourite}</Badge>
                ) : client.flag === 'attention' ? (
                  <Badge tone="warning">{t.clients.flagAttention}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="person-card__facts">
            <dt>{t.clients.colPhone}</dt>
            <dd className="tnum">
              <a href={telLink(client.phone)}>{formatPhone(client.phone)}</a>
            </dd>
            <dt>{t.clients.exportEmail}</dt>
            <dd>
              {client.email ? (
                <a href={`mailto:${client.email}`}>{client.email}</a>
              ) : (
                <span className="person-card__none">{t.clients.noData}</span>
              )}
            </dd>
            <dt>{t.clients.favouriteService}</dt>
            <dd>
              {stats.favoriteServiceName ?? (
                <span className="person-card__none">{t.clients.noData}</span>
              )}
            </dd>
          </dl>

          {/* Три равных пути к человеку, а не один главный: чем писать —
              решает клиент, а не кабинет. */}
          <div className="person-card__contacts">
            <Button asChild variant="secondary" size="sm">
              <a href={telLink(client.phone)}>
                <Icon name="phone" className="ico-16" />
                <span>{t.bookings.callClient}</span>
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={whatsAppLink(client.phone)} target="_blank" rel="noreferrer">
                <Icon name="messageCircle" className="ico-16" />
                <span>{t.bookings.writeWhatsApp}</span>
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={smsLink(client.phone)}>
                <Icon name="messageCircle" className="ico-16" />
                <span>{t.bookings.writeSms}</span>
              </a>
            </Button>
          </div>
        </Card>

        <div className="person-grid__side">
          <Card>
            <p className="stat-cell__label">{t.clients.completedVisits}</p>
            <p className="stat-cell__value tnum">{stats.completedCount}</p>
            <p className="stat-cell__hint">
              {stats.lastVisitAt
                ? fmt(t.clients.lastVisitOn, { date: date(stats.lastVisitAt) })
                : t.clients.noCompleted}
            </p>
          </Card>

          <section className="income-card">
            <p className="income-card__label">{t.clients.spent}</p>
            <p className="income-card__value tnum">
              {formatPrice(stats.spentAmount, 'EUR', locale)}
            </p>
            <p className="income-card__hint">{t.clients.spentHint}</p>
          </section>

          <Card>
            <p className="stat-cell__label">{t.clients.cancelledCount}</p>
            <p className="stat-cell__value tnum">{stats.cancelledCount}</p>
            <p className="stat-cell__hint">
              {fmt(t.clients.noShowHint, { count: stats.noShowCount })}
            </p>
          </Card>

          <Card className="person-grid__full">
            <CardHeader>
              <div>
                <CardTitle>{t.clients.notes}</CardTitle>
                <CardHint>{t.clients.notesHint}</CardHint>
              </div>
              <button type="button" className="cell-link" onClick={() => setEditing(true)}>
                {t.clients.editNotes}
              </button>
            </CardHeader>
            {client.notes ? (
              <p className="client-notes">{client.notes}</p>
            ) : (
              <p className="person-card__none">{t.clients.notesEmpty}</p>
            )}
          </Card>
        </div>

        {/* Без розовой заливки: розовым на карточке — одна кнопка записи. */}
        <Card className="person-grid__wide">
          <CardHeader>
            <div>
              <CardTitle>{t.clients.upcoming}</CardTitle>
              {upcoming.length > 0 ? <CardHint>{t.clients.upcomingHint}</CardHint> : null}
            </div>
            {upcoming.length > 0 ? null : (
              <button type="button" className="cell-link" onClick={() => setBooking(true)}>
                {t.clients.newBooking}
              </button>
            )}
          </CardHeader>
          {upcoming.length > 0 ? (
            <div className="client-upcoming-row">
              {/* Строка визита прототипа: час и длительность, кто и что. День —
                  только у записи не на сегодня. Каждая строка ведёт в запись,
                  где её и переносят. */}
              {upcoming.map((item) => (
                <VisitRow
                  key={item.id}
                  startsAt={item.startsAt}
                  minutes={minutesOf(item)}
                  /* Имя клиента здесь не повторяется в каждой строке — это
                     его карточка. Строка называет услугу и длительность. */
                  clientName={item.items.map((line) => line.serviceNameSnapshot).join(' + ')}
                  serviceName={teamView ? (memberOf(item.organizationMemberId) ?? '') : ''}
                  status={item.status}
                  day={
                    date(item.startsAt) === date(new Date().toISOString())
                      ? undefined
                      : date(item.startsAt)
                  }
                  href={bookingHref(item.id)}
                />
              ))}
            </div>
          ) : (
            <p className="person-card__none">{t.clients.noUpcoming}</p>
          )}
        </Card>

        <Card className="person-grid__wide">
          <CardHeader>
            <div>
              <CardTitle>{t.clients.historyTitle}</CardTitle>
              <CardHint>
                {fmt(t.clients.historyCount, {
                  count: past.length,
                  bookings: plural(locale, past.length, t.common.bookingForms),
                })}
              </CardHint>
            </div>
          </CardHeader>

          {historyQuery.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : past.length === 0 ? (
            <p className="person-card__none">{t.clients.historyEmpty}</p>
          ) : (
            <div className="list-table-wrap">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>{t.clients.colDate}</th>
                    <th>{t.clients.colTime}</th>
                    <th>{t.clients.colService}</th>
                    <th>{t.clients.colDuration}</th>
                    <th className="r">{t.clients.colPrice}</th>
                    <th>{t.clients.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((item) => (
                    <tr
                      key={item.id}
                      className="is-click"
                      onClick={() => router.push(bookingHref(item.id))}
                    >
                      <td>
                        <span className="cellname">
                          <span className="cellname__text">
                            <Link
                              className="cellname__title"
                              href={bookingHref(item.id)}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {date(item.startsAt)}
                            </Link>
                          </span>
                        </span>
                      </td>
                      <td className="hide-m tnum">{time(item.startsAt)}</td>
                      {/* На телефоне под услугой — «15:00 · 1 ч», как в прототипе. */}
                      <td>
                        {item.items.map((line) => line.serviceNameSnapshot).join(' + ')}
                        <small className="m-only tnum">
                          {time(item.startsAt)} · {duration(item)}
                        </small>
                      </td>
                      <td className="hide-m">{duration(item)}</td>
                      <td className="r m-right tnum">
                        {formatPrice(totalOf(item), currencyOf(item), locale)}
                      </td>
                      <td className="hide-m">
                        {/* Прошедший визит без отметки — не «Подтверждена»: рядом
                            со счётчиком завершённых такая строка читалась
                            противоречием. */}
                        {item.status === 'confirmed' || item.status === 'pending' ? (
                          <Badge tone="warning">{t.clients.notMarked}</Badge>
                        ) : (
                          <Badge tone={statusMeta[item.status].tone}>
                            {statusMeta[item.status].label}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {visitsLeft > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="client-more"
              onClick={() => setVisitsShown((shown) => shown + VISITS_PAGE)}
            >
              {fmt(t.common.showMore, { count: Math.min(VISITS_PAGE, visitsLeft) })}
            </Button>
          ) : null}
        </Card>
      </div>

      <ClientFormSheet
        open={editing}
        onOpenChange={setEditing}
        client={client}
        submitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutateAsync(values).then(() => undefined)}
      />

      <ConfirmSheet
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={t.clients.blockConfirmTitle}
        description={fmt(t.clients.blockConfirmText, { name: client.fullName })}
        confirmLabel={t.clients.block}
        onConfirm={() => blockMutation.mutate(true)}
        loading={blockMutation.isPending}
      />

      <NewBookingSheet
        open={booking}
        onOpenChange={setBooking}
        availableSlots={slotsQuery.data ?? []}
        services={servicesQuery.data ?? []}
        submitting={createMutation.isPending}
        guest={{ name: client.fullName, phone: client.phone }}
        clients={[client]}
        members={selectableMembers(roster.data)}
        memberId={workspace?.memberId}
        onSubmit={(input) => createMutation.mutateAsync(input).then(() => undefined)}
      />
    </>
  );
}
