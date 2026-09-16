'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DangerZone } from '@/components/ui/danger-zone';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import type { Client } from '@/features/clients/types';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { avatarTint, initials } from '@/lib/avatar';
import {
  dayKey,
  formatDayShort,
  formatDuration,
  formatLongDay,
  formatPhone,
  formatPrice,
  formatTime,
} from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useNow } from '@/lib/use-now';

import { findClientByPhone } from '../client-match';
import { getBookingStatusMeta } from '../status-meta';
import type { Booking, BookingStatus } from '../types';
import { ContactActions } from './contact-actions';

/** Визит закрыт: подтверждать, завершать и переносить больше нечего. */
const CLOSED: BookingStatus[] = [
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
  'expired',
];

const DAY_MS = 86_400_000;

/**
 * Карточка визита — шторка `bookingDetail` прототипа «Кабинет 2026».
 *
 * Заголовок — имя клиента, под ним статус и «создана 5 сен, клиент, со
 * страницы записи». Розовый блок времени с «Перенести», под ним то, что
 * решается сейчас: «Отклонить запись» у ждущей, «Клиент не пришёл» у
 * начавшейся. Клиент с кнопками связи и карточкой, услуги с итогом, заметка;
 * отмена — в красной рамке «Если визит не состоится».
 *
 * В подвале «Закрыть» и главное действие по состоянию: у ждущей — «Подтвердить
 * запись», у начавшейся — «Завершить визит» (по нему считается доход), у
 * будущей — «Изменить запись», у закрытой — «Изменить заметку».
 */
export function BookingDetailSheet({
  open,
  onOpenChange,
  slug,
  booking,
  clients,
  memberName,
  busy,
  onSetStatus,
  onEdit,
  onReschedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  booking: Booking | null;
  clients: Client[];
  /** К кому визит — в строке под временем; у одиночки не показывается. */
  memberName?: string | null;
  busy: boolean;
  onSetStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
  onReschedule?: (booking: Booking) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t);
  const now = useNow();

  if (!booking) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={t.bookings.detailTitle}>
        {null}
      </Sheet>
    );
  }

  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };
  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const status = meta[booking.status];
  const closed = CLOSED.includes(booking.status);
  const client = findClientByPhone(clients, booking.guestPhone);
  const name = booking.guestName ?? client?.fullName ?? t.admin.noName;
  const endsAt = new Date(new Date(booking.startsAt).getTime() + minutes * 60_000).toISOString();
  /* Началось ли уже то, что можно объявить состоявшимся. Час визита
     сравнивается с текущим моментом, а не со сменой суток: визит,
     назначенный на сегодняшний вечер, днём ещё не состоялся.

     Пока часы неизвестны (первый кадр, разметка с сервера), считаем, что не
     начался: лучше один кадр без «Завершить», чем кнопка, заводящая доход за
     визит, которого не было. */
  const started = now !== null && new Date(booking.startsAt).getTime() <= now;

  /* «Сегодня, 12 сентября» — день словом, когда он ближайший. */
  const day = dayKey(booking.startsAt, timeZone);
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(booking.startsAt));
  const longDay = formatLongDay(booking.startsAt, locale, timeZone);
  const dayLabel =
    now !== null && day === dayKey(new Date(now), timeZone)
      ? `${t.bookings.today}, ${dayMonth}`
      : now !== null && day === dayKey(new Date(now + DAY_MS), timeZone)
        ? `${t.bookings.tomorrow}, ${dayMonth}`
        : longDay.charAt(0).toLocaleUpperCase(locale) + longDay.slice(1);

  const created = fmt(t.bookings.createdLine, {
    date: formatDayShort(booking.createdAt, locale, timeZone, false),
    source:
      booking.source === 'admin_manual'
        ? t.bookings.byYou
        : `${t.bookings.byClient}, ${t.bookings.viaBookingPage}`,
  });

  const visits = client?.visitStats.totalBookings ?? 0;
  const clientFacts = [
    booking.guestPhone ? formatPhone(booking.guestPhone) : null,
    client ? fmt(t.clients.visitsCount, { count: visits }) : null,
    client?.flag === 'favourite' ? t.clients.flagFavourite.toLocaleLowerCase(locale) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const footer = (
    <>
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        {t.common.close}
      </Button>
      {closed ? (
        <Button onClick={() => onEdit(booking)}>{t.bookings.editNote}</Button>
      ) : booking.status === 'pending' || started ? (
        <>
          <Button variant="secondary" onClick={() => onEdit(booking)}>
            <Icon name="edit" className="ico-16" />
            <span>{t.bookings.editBooking}</span>
          </Button>
          {/* «Завершить» — главное действие прошедшего визита: по нему
              считается доход, и без него он не попадёт в финансы. */}
          <Button
            disabled={busy}
            onClick={() =>
              onSetStatus(booking, booking.status === 'pending' ? 'confirmed' : 'completed')
            }
          >
            <Icon name="check" className="ico-16" />
            <span>
              {booking.status === 'pending' ? t.bookings.confirmBooking : t.bookings.completeVisit}
            </span>
          </Button>
        </>
      ) : (
        <Button onClick={() => onEdit(booking)}>
          <Icon name="edit" className="ico-16" />
          <span>{t.bookings.editTitle}</span>
        </Button>
      )}
    </>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={
        <>
          <Badge variant="pill" tone={status.tone}>
            {status.label}
          </Badge>
          <span>· {created}</span>
        </>
      }
      footer={footer}
    >
      <div className="flex flex-col gap-6">
        <div className="visit-time">
          <div className="min-w-0">
            <p className="visit-time__day">{dayLabel}</p>
            <p className="visit-time__value tnum">
              {formatTime(booking.startsAt, locale, timeZone)}–
              {formatTime(endsAt, locale, timeZone)}
            </p>
            <p className="visit-time__line">
              {formatDuration(minutes, units)}
              {memberName ? ` · ${memberName}` : ''}
            </p>
          </div>
          {!closed && onReschedule ? (
            <Button
              variant="secondary"
              size="sm"
              className="visit-time__action"
              onClick={() => onReschedule(booking)}
            >
              <Icon name="clock" className="ico-16" />
              <span>{t.bookings.reschedule}</span>
            </Button>
          ) : null}
        </div>

        {/* Что решается сейчас — сразу под временем. У ждущей один отказ, а не
            два: «Отклонить» и «Отменить» звали один и тот же
            `cancelled_by_master` с тем же подтверждением. */}
        {booking.status === 'pending' ? (
          <div>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => onSetStatus(booking, 'cancelled_by_master')}
            >
              <Icon name="x" className="ico-16" />
              <span>{t.bookings.declineBooking}</span>
            </Button>
          </div>
        ) : booking.status === 'confirmed' && started ? (
          <div>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => onSetStatus(booking, 'no_show')}
            >
              <Icon name="alert" className="ico-16" />
              <span>{t.bookings.clientNoShow}</span>
            </Button>
          </div>
        ) : booking.status === 'confirmed' ? (
          <p className="form-field__hint">{t.bookings.completeAfterStart}</p>
        ) : booking.status === 'no_show' ? (
          /* Промах пальцем рядом с «Завершить» перестал быть приговором:
             уведомление с «Вернуть» живёт секунды, а карточка — всегда. */
          <div className="flex flex-col items-start gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onSetStatus(booking, 'confirmed')}
            >
              <Icon name="refresh" className="ico-16" />
              <span>{t.bookings.restoreStatus}</span>
            </Button>
            <p className="form-field__hint">{t.bookings.restoreHint}</p>
          </div>
        ) : null}

        <SheetSection title={t.bookings.sectionClient}>
          <div className="client-card">
            <span
              className="list-avatar"
              style={avatarTint(client?.id ?? booking.id)}
              aria-hidden="true"
            >
              {initials(name)}
            </span>
            <div className="client-card__text">
              <b>{name}</b>
              {!client || visits === 0 ? (
                <span className="first-visit-chip">{t.bookings.firstVisit}</span>
              ) : null}
              {clientFacts ? <span className="client-card__meta tnum">{clientFacts}</span> : null}
              <div className="client-card__actions">
                <ContactActions
                  tone="plain"
                  size="pill"
                  phone={booking.guestPhone}
                  instagram={booking.guestInstagram ?? client?.instagramHandle ?? null}
                />
                {client ? (
                  <Button asChild variant="ghost" size="pill">
                    <Link href={`/${slug}/dashboard/clients/${client.id}`}>
                      {t.bookings.clientCard}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </SheetSection>

        <SheetSection title={t.bookings.sectionServices}>
          {booking.items.length ? (
            <div className="visit-services">
              {booking.items.map((item) => (
                <div key={item.id} className="visit-service">
                  <span className="min-w-0">
                    <span className="visit-service__name">{item.serviceNameSnapshot}</span>
                    <span className="visit-service__sub">
                      {formatDuration(item.durationMinutesSnapshot, units)}
                    </span>
                  </span>
                  <b className="visit-service__price tnum">
                    {formatPrice(item.priceAmountSnapshot, item.priceCurrencySnapshot, locale)}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="form-field__hint">{t.admin.noServices}</p>
          )}
          <div className="visit-sum">
            <span>{t.bookings.total}</span>
            <b className="tnum">{formatPrice(total, currency, locale)}</b>
          </div>
        </SheetSection>

        <SheetSection title={t.bookings.noteLabel}>
          {booking.notes ? (
            <p className="visit-note">{booking.notes}</p>
          ) : (
            <p className="form-field__hint">{t.bookings.noNote}</p>
          )}
        </SheetSection>

        {!closed ? (
          <DangerZone title={t.bookings.ifVisitFails} hint={t.bookings.cancelHint}>
            <Button
              variant="danger"
              size="sm"
              className="danger-zone__action"
              disabled={busy}
              onClick={() => onSetStatus(booking, 'cancelled_by_master')}
            >
              <Icon name="x" className="ico-16" />
              <span>{t.bookings.cancelBooking}</span>
            </Button>
          </DangerZone>
        ) : null}
      </div>
    </Sheet>
  );
}
