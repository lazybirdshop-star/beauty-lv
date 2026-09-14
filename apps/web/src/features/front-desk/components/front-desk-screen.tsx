'use client';

/**
 * Ресепшен — прототип «Кабинет 2026», экран `front-desk`; спецификация
 * дашборда §58.
 *
 * Не вторая сетка календаря: у стойки не планируют неделю, а встречают людей.
 * Сверху — часы антиквой и счётчики дня. Слева — кресла команды: у занятого
 * кольцо и полоса того, сколько визита прошло, и «Завершить»; у свободного —
 * когда следующая запись. Под креслами розовая ячейка «Ждут отметки», если
 * кого-то забыли отметить. Справа — кто дальше сегодня и кто уже ушёл.
 *
 * «Завершить» и «Подтвердить» — одним нажатием; «Не пришёл» — тоже одним, но
 * с «Отменить» в тосте: механика та же, что у карточки визита
 * (`useBookingSheets`), и сама карточка открывается отсюда же.
 *
 * Экран обновляется раз в минуту и сам переводит визит из «дальше» в «в
 * кресле» и из «в кресле» в «ждут отметки» — администратору не нужно
 * перезагружать страницу, чтобы узнать, что клиент уже должен был прийти.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { listBookings } from '@/features/bookings/api';
import { BookingSheets } from '@/features/bookings/components/booking-sheets';
import { VisitRow } from '@/features/bookings/components/visit-row';
import type { Booking } from '@/features/bookings/types';
import { useBookingSheets } from '@/features/bookings/use-booking-sheets';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import type { TeamMember } from '@/features/team/types';
import { useTeamRoster } from '@/features/team/use-team-roster';
import { teamTones } from '@/lib/avatar';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { formatDate, formatDuration, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { frontDeskModel, visitEnd } from '../front-desk-model';

const MINUTE = 60_000;

type DeskStatus = 'completed' | 'confirmed' | 'no_show';

export function FrontDeskScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;

  /* Минута — шаг стойки: визит переходит между группами без перезагрузки. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);

  const query = useQuery({
    /* Под префиксом `['bookings', slug]`: любое действие с записью в кабинете
       гасит и этот экран. День в ключе — в полночь приезжает новый. */
    queryKey: ['bookings', slug, 'front-desk', dayKey],
    queryFn: () => listBookings(slug, dayWindow(new Date(), timeZone)),
    refetchInterval: MINUTE,
  });
  const roster = useTeamRoster(slug, true);
  const members = useMemo(
    () => (roster.data ?? []).filter((member) => member.status === 'active'),
    [roster.data],
  );
  const nameOf = useMemo(
    () => new Map((roster.data ?? []).map((member) => [member.id, member.name])),
    [roster.data],
  );
  /* Тон человека — тот же, что в календаре и на «Команде»: кольцо Юли одного
     цвета с её колонкой. */
  const tones = useMemo(() => teamTones(members.map((member) => member.id)), [members]);
  const sheets = useBookingSheets(slug, query.data);
  const model = useMemo(() => frontDeskModel(query.data ?? [], now), [query.data, now]);

  const time = (value: string | number) => formatTime(new Date(value), locale, timeZone);
  const services = (booking: Booking) =>
    booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
  const duration = (minutes: number) =>
    formatDuration(minutes, {
      hoursShort: t.common.hoursShort,
      minutesShort: t.common.minutesShort,
    });
  const toneStyle = (memberId: string) =>
    tones[memberId]
      ? ({ '--member': `var(--tone-${tones[memberId]})` } as CSSProperties)
      : undefined;

  function statusButton(booking: Booking, status: DeskStatus, variant: 'secondary' | 'ghost') {
    return (
      <Button
        variant={variant}
        size="pill"
        disabled={sheets.updatingId === booking.id}
        onClick={() => sheets.setStatus(booking, status)}
      >
        {status === 'no_show' ? null : <Icon name="check" className="ico-16" />}
        <span>
          {status === 'completed'
            ? t.bookings.markCompleted
            : status === 'confirmed'
              ? t.bookings.confirm
              : t.bookings.markNoShow}
        </span>
      </Button>
    );
  }

  function callButton(booking: Booking) {
    if (!booking.guestPhone) return null;
    return (
      <Button asChild variant="ghost" size="pill" className="desk-call">
        <a
          href={`tel:${booking.guestPhone.replace(/\s/g, '')}`}
          aria-label={`${t.workspace.deskCall}: ${booking.guestPhone}`}
        >
          <Icon name="phone" className="ico-16" />
        </a>
      </Button>
    );
  }

  function visit(booking: Booking, action: ReactNode, past = false) {
    return (
      <VisitRow
        key={booking.id}
        startsAt={booking.startsAt}
        minutes={Math.round((visitEnd(booking) - Date.parse(booking.startsAt)) / MINUTE)}
        clientName={booking.guestName || t.home.guest}
        serviceName={services(booking)}
        status={booking.status}
        memberName={nameOf.get(booking.organizationMemberId)}
        past={past}
        onOpen={() => sheets.view(booking.id)}
        action={action}
      />
    );
  }

  function busyChair(booking: Booking) {
    const start = Date.parse(booking.startsAt);
    const end = visitEnd(booking);
    const progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    const memberName = nameOf.get(booking.organizationMemberId);

    return (
      <div className="chair" key={booking.id} style={toneStyle(booking.organizationMemberId)}>
        <span
          className="chair__ring"
          style={{ '--p': progress } as CSSProperties}
          aria-hidden="true"
        />
        <button type="button" className="chair__main" onClick={() => sheets.view(booking.id)}>
          <span className="chair__name">{booking.guestName || t.home.guest}</span>
          <span className="chair__meta">
            <i className="chair__dot" aria-hidden="true" />
            {[memberName, services(booking)].filter(Boolean).join(' · ')}
          </span>
          <span className="chair__left tnum">
            {fmt(t.workspace.deskLeft, {
              duration: duration(Math.max(1, Math.ceil((end - now) / MINUTE))),
              time: time(end),
            })}
          </span>
          <span className="chair__progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        </button>
        <span className="chair__acts">
          {statusButton(booking, 'completed', 'secondary')}
          {callButton(booking)}
        </span>
      </div>
    );
  }

  function freeChair(member: TeamMember) {
    const upcoming = model.next.find((booking) => booking.organizationMemberId === member.id);
    return (
      <div className="chair is-free" key={member.id} style={toneStyle(member.id)}>
        <MemberAvatar
          className="chair__avatar"
          name={member.name}
          seed={member.id}
          url={member.avatarUrl}
          focal={member.avatarFocal}
        />
        <span className="chair__main">
          <span className="chair__name">{member.name}</span>
          <span className="chair__meta">
            {upcoming
              ? fmt(t.workspace.deskFreeNext, { time: time(upcoming.startsAt) })
              : t.workspace.deskFreeNone}
          </span>
        </span>
      </div>
    );
  }

  /* Кресла — по команде: у каждого работающего своё, занятое или свободное.
     Визит человека, которого в списке нет (отстранён, но час продан), всё
     равно встаёт креслом — у стойки его клиент сидит по-настоящему. */
  const chairs: ReactNode[] = [];
  const seated = new Set<string>();
  let busyCount = 0;
  for (const member of members) {
    const mine = model.inChair.filter((booking) => booking.organizationMemberId === member.id);
    if (mine.length) {
      busyCount += 1;
      for (const booking of mine) {
        seated.add(booking.id);
        chairs.push(busyChair(booking));
      }
    } else {
      chairs.push(freeChair(member));
    }
  }
  for (const booking of model.inChair) {
    if (!seated.has(booking.id)) chairs.push(busyChair(booking));
  }

  const lastEnd = model.next.length ? Math.max(...model.next.map(visitEnd)) : null;

  return (
    <>
      <PageHeader
        title={t.nav.frontDesk}
        meta={t.workspace.deskHint}
        actions={
          <Button
            size="sm"
            className="page-action--create"
            onClick={() => openWorkspaceAction({ kind: 'booking' })}
          >
            <Icon name="plus" className="ico-18" />
            <span>{t.home.newBooking}</span>
          </Button>
        }
      />

      <div className="desk-clock">
        <p className="desk-clock__now">
          <b className="desk-clock__time tnum">{time(now)}</b>
          <span className="desk-clock__date">{formatDate(new Date(now), locale, timeZone)}</span>
        </p>
        {query.data ? (
          <p className="desk-clock__chips">
            <span className="desk-chip tnum">
              {fmt(t.workspace.deskDone, { count: model.doneCount })}
            </span>
            <span className="desk-chip tnum">
              {fmt(t.workspace.deskChipNext, { count: model.next.length })}
            </span>
            {model.awaiting.length ? (
              <span className="desk-chip is-accent tnum">
                {fmt(t.workspace.deskChipAwaiting, { count: model.awaiting.length })}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="desk-grid">
          <div className="desk-stack">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.workspace.deskInChair}</CardTitle>
                  {members.length ? (
                    <CardHint>
                      {fmt(t.workspace.deskBusyOf, { busy: busyCount, total: members.length })}
                    </CardHint>
                  ) : null}
                </div>
              </CardHeader>
              {roster.isPending ? (
                <Skeleton className="h-32 w-full" />
              ) : chairs.length ? (
                <div className="desk-chairs">{chairs}</div>
              ) : (
                <p className="desk-empty">{t.workspace.deskChairEmpty}</p>
              )}
            </Card>

            {/* То, что уже просрочено, — розовой ячейкой прямо под креслами:
                не отмеченный визит не попадает в доход и висит
                «подтверждённым» в прошлом. */}
            {model.awaiting.length ? (
              <Card tone="free">
                <CardHeader>
                  <div>
                    <CardTitle>{t.workspace.deskAwaiting}</CardTitle>
                    <CardHint>{t.workspace.deskAwaitingHint}</CardHint>
                  </div>
                </CardHeader>
                <div className="desk-visits">
                  {model.awaiting.map((booking) =>
                    visit(
                      booking,
                      <>
                        {statusButton(booking, 'completed', 'secondary')}
                        {statusButton(booking, 'no_show', 'ghost')}
                      </>,
                    ),
                  )}
                </div>
              </Card>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.workspace.deskNext}</CardTitle>
                {lastEnd !== null ? (
                  <CardHint>
                    {fmt(t.workspace.deskNextHint, {
                      count: model.next.length,
                      time: time(lastEnd),
                    })}
                  </CardHint>
                ) : null}
              </div>
            </CardHeader>
            {model.next.length ? (
              <div className="desk-visits">
                {model.next.map((booking) =>
                  visit(
                    booking,
                    booking.status === 'pending'
                      ? statusButton(booking, 'confirmed', 'secondary')
                      : callButton(booking),
                  ),
                )}
              </div>
            ) : (
              <p className="desk-empty">{t.workspace.deskNextEmpty}</p>
            )}

            {model.done.length ? (
              <>
                <h3 className="desk-group-head">
                  {t.workspace.deskDoneTitle}
                  <span className="tnum">{model.done.length}</span>
                </h3>
                <div className="desk-visits">
                  {model.done.map((booking) => visit(booking, null, true))}
                </div>
              </>
            ) : null}
          </Card>
        </div>
      )}

      <BookingSheets {...sheets.props} />
    </>
  );
}
