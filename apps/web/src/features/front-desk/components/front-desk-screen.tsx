'use client';

/**
 * Ресепшен — день всей команды тремя вопросами (спецификация дашборда §58).
 *
 * Не вторая сетка календаря: у стойки не планируют неделю, а встречают людей.
 * Кто сейчас в креслах, кого ждать дальше и кого забыли отметить — с
 * действием прямо в строке. «Завершить» и «Подтвердить» — одним нажатием;
 * «Не пришёл» — тоже одним, но с «Отменить» в тосте: механика та же, что у
 * карточки визита (`useBookingSheets`), и сама карточка открывается отсюда же.
 *
 * Экран обновляется раз в минуту и сам переводит визит из «дальше» в «в
 * кресле» и из «в кресле» в «ждут отметки» — администратору не нужно
 * перезагружать страницу, чтобы узнать, что клиент уже должен был прийти.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { listBookings } from '@/features/bookings/api';
import { BookingSheets } from '@/features/bookings/components/booking-sheets';
import type { Booking } from '@/features/bookings/types';
import { useBookingSheets } from '@/features/bookings/use-booking-sheets';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useTeamRoster } from '@/features/team/use-team-roster';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { formatDate, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { frontDeskModel, visitEnd } from '../front-desk-model';

type RowAction = 'complete' | 'confirm' | 'noShow';

export function FrontDeskScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;

  /* Минута — шаг стойки: визит переходит между группами без перезагрузки. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);

  const query = useQuery({
    /* Под префиксом `['bookings', slug]`: любое действие с записью в кабинете
       гасит и этот экран. День в ключе — в полночь приезжает новый. */
    queryKey: ['bookings', slug, 'front-desk', dayKey],
    queryFn: () => listBookings(slug, dayWindow(new Date(), timeZone)),
    refetchInterval: 60_000,
  });
  const roster = useTeamRoster(slug, true);
  const nameOf = useMemo(
    () => new Map((roster.data ?? []).map((member) => [member.id, member.name])),
    [roster.data],
  );
  const sheets = useBookingSheets(slug, query.data);
  const model = useMemo(() => frontDeskModel(query.data ?? [], now), [query.data, now]);

  const time = (value: string | number) => formatTime(new Date(value), locale, timeZone);

  function row(booking: Booking, actions: RowAction[]) {
    const busy = sheets.updatingId === booking.id;
    const services = booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
    const member = nameOf.get(booking.organizationMemberId);

    return (
      <li className="desk-row" key={booking.id}>
        <button type="button" className="desk-row__main" onClick={() => sheets.view(booking.id)}>
          <span className="desk-row__time tnum">
            {time(booking.startsAt)}–{time(visitEnd(booking))}
          </span>
          <span className="desk-row__text">
            <span className="desk-row__client">{booking.guestName || t.home.guest}</span>
            <span className="t-meta">{[services, member].filter(Boolean).join(' · ')}</span>
          </span>
          {booking.status === 'pending' ? (
            <span className="badge b-amber">
              <span className="dot" />
              {t.bookings.filterNew}
            </span>
          ) : null}
        </button>
        <div className="desk-row__actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() =>
                sheets.setStatus(
                  booking,
                  action === 'complete'
                    ? 'completed'
                    : action === 'confirm'
                      ? 'confirmed'
                      : 'no_show',
                )
              }
            >
              {action === 'complete'
                ? t.bookings.markCompleted
                : action === 'confirm'
                  ? t.bookings.confirm
                  : t.bookings.markNoShow}
            </button>
          ))}
          {booking.guestPhone ? (
            <a
              className="btn btn-secondary btn-sm btn-icon"
              href={`tel:${booking.guestPhone.replace(/\s/g, '')}`}
              aria-label={booking.guestPhone}
            >
              <Icon name="phone" className="ico-16" />
            </a>
          ) : null}
        </div>
      </li>
    );
  }

  function section(
    id: string,
    title: string,
    bookings: Booking[],
    actionsFor: (booking: Booking) => RowAction[],
    empty: string,
  ) {
    return (
      <section className="desk-section" aria-labelledby={`desk-${id}`}>
        <div className="desk-section__head">
          <h2 id={`desk-${id}`} className="t-section">
            {title}
          </h2>
          <span className="t-meta tnum">{bookings.length}</span>
        </div>
        <div className="card">
          {bookings.length ? (
            <ul className="desk-list">
              {bookings.map((booking) => row(booking, actionsFor(booking)))}
            </ul>
          ) : (
            <p className="t-meta desk-empty">{empty}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        title={t.nav.frontDesk}
        meta={[
          formatDate(new Date(now), locale, timeZone),
          fmt(t.workspace.deskDone, { count: model.doneCount }),
        ].join(' · ')}
        actions={
          <button
            type="button"
            className="btn btn-secondary page-action--create"
            onClick={() => openWorkspaceAction({ kind: 'booking' })}
          >
            <Icon name="plus" className="ico-18" />
            <span>{t.home.newBooking}</span>
          </button>
        }
      />

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="desk-grid">
          {/* «Ждут отметки» — первыми, если они есть: это то, что уже
              просрочено, а не то, что ещё случится. */}
          {model.awaiting.length
            ? section(
                'awaiting',
                t.workspace.deskAwaiting,
                model.awaiting,
                () => ['complete', 'noShow'],
                '',
              )
            : null}
          {section(
            'chair',
            t.workspace.deskInChair,
            model.inChair,
            () => ['complete'],
            t.workspace.deskChairEmpty,
          )}
          {section(
            'next',
            t.workspace.deskNext,
            model.next,
            (booking) => (booking.status === 'pending' ? ['confirm'] : []),
            t.workspace.deskNextEmpty,
          )}
        </div>
      )}

      <BookingSheets {...sheets.props} />
    </>
  );
}
