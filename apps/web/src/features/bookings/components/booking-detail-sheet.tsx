'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Client } from '@/features/clients/types';
import { serviceTone } from '@/features/services/service-tone';
import { formatDateTime, formatDuration, formatLongDay, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useNow } from '@/lib/use-now';

import { findClientByPhone } from '../client-match';
import { getBookingStatusMeta } from '../status-meta';
import type { Booking, BookingStatus } from '../types';
import { ClientStrip } from './client-strip';
import { ContactActions } from './contact-actions';
import { ServiceLine } from './service-line';
import { TimeFigure } from './time-figure';

/** Визит закрыт: подтверждать, завершать и переносить больше нечего. */
const CLOSED: BookingStatus[] = [
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
  'expired',
];

/**
 * Карточка визита — Design System V2 §7: читающая композиция.
 *
 * Сверху статус пилюлей, затем крупная цифра времени с полосой услуги,
 * полоска клиента с «Позвонить · Написать», услуги с итогом, заметка и
 * происхождение записи — секции разделены воздухом и одной линией, а не
 * коробками. Действия — в закреплённом футере, по состоянию визита: у
 * ждущей главный вопрос «приму ли я её», у подтверждённой — «состоялся ли
 * визит», у закрытой не остаётся ни одного.
 *
 * Отмена — только словами (`Button variant="danger"`): у неё нет обратной
 * кнопки, и в одном ряду с «Завершить» она не стоит.
 */
export function BookingDetailSheet({
  open,
  onOpenChange,
  slug,
  booking,
  clients,
  busy,
  onSetStatus,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  booking: Booking | null;
  clients: Client[];
  busy: boolean;
  onSetStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t);
  const now = useNow();

  if (!booking) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={t.bookings.detailTitle}>
        <p className="type-meta">{t.bookings.notFound}</p>
      </Sheet>
    );
  }

  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const status = meta[booking.status];
  const closed = CLOSED.includes(booking.status);
  const tone = serviceTone(booking.items[0]?.serviceId ?? booking.id);
  const client = findClientByPhone(clients, booking.guestPhone);
  const durationLabel = formatDuration(minutes, {
    hoursShort: t.common.hoursShort,
    minutesShort: t.common.minutesShort,
  });
  /* Началось ли уже то, что можно объявить состоявшимся. Час визита
     сравнивается с текущим моментом, а не со сменой суток: визит,
     назначенный на сегодняшний вечер, днём ещё не состоялся.

     Пока часы неизвестны (первый кадр, разметка с сервера), считаем, что не
     начался: лучше один кадр без «Завершить», чем кнопка, заводящая доход за
     визит, которого не было. */
  const started = now !== null && new Date(booking.startsAt).getTime() <= now;

  const footer = closed ? (
    <span className="type-meta">{t.bookings.doneHint}</span>
  ) : booking.status === 'pending' ? (
    /*
     * У ждущей записи один отказ, а не два: «Отклонить» и «Отменить» звали
     * один и тот же `cancelled_by_master` с тем же подтверждением.
     */
    <>
      <Button className="flex-1" disabled={busy} onClick={() => onSetStatus(booking, 'confirmed')}>
        {t.bookings.confirm}
      </Button>
      <Button
        variant="secondary"
        className="flex-1"
        disabled={busy}
        onClick={() => onSetStatus(booking, 'cancelled_by_master')}
      >
        {t.bookings.decline}
      </Button>
    </>
  ) : (
    <>
      {started ? (
        <>
          {/* «Завершить» — главное действие прошедшего визита: по нему
              считается доход, и без него он не попадёт в финансы. */}
          <Button
            variant="success"
            className="flex-1"
            disabled={busy}
            onClick={() => onSetStatus(booking, 'completed')}
          >
            {t.bookings.markCompleted}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => onSetStatus(booking, 'no_show')}
          >
            {t.bookings.markNoShow}
          </Button>
        </>
      ) : (
        <Button className="flex-1" onClick={() => onEdit(booking)}>
          {t.bookings.editBooking}
        </Button>
      )}
      {/* Вторая строка тише первой: изменить и отменить — не то, ради чего
          открывают прошедший визит, и весить как «Завершить» они не должны. */}
      <div className="flex w-full items-center justify-between gap-3">
        {started ? (
          <Button variant="flat" size="sm" onClick={() => onEdit(booking)}>
            {t.bookings.editBooking}
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={() => onSetStatus(booking, 'cancelled_by_master')}
        >
          {t.bookings.cancelBooking}
        </Button>
      </div>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.bookings.detailTitle} footer={footer}>
      <div className="flex flex-col gap-5">
        <div>
          <Badge variant="pill" tone={status.tone}>
            {status.label}
          </Badge>
        </div>

        <TimeFigure
          startsAt={booking.startsAt}
          minutes={minutes}
          tone={tone}
          line={`${formatLongDay(booking.startsAt, locale, timeZone)} · ${durationLabel}`}
        />

        <section className="panel-section" aria-label={t.bookings.sectionClient}>
          <ClientStrip
            slug={slug}
            client={client}
            name={booking.guestName ?? t.admin.noName}
            phone={booking.guestPhone}
          />
          <ContactActions
            phone={booking.guestPhone}
            instagram={booking.guestInstagram ?? client?.instagramHandle ?? null}
          />
        </section>

        <section className="panel-section" aria-label={t.bookings.sectionServices}>
          <h3 className="type-meta">{t.bookings.sectionServices}</h3>
          {booking.items.length ? (
            <div>
              {booking.items.map((item) => (
                <ServiceLine
                  key={item.id}
                  name={item.serviceNameSnapshot}
                  minutes={item.durationMinutesSnapshot}
                  price={item.priceAmountSnapshot}
                  currency={item.priceCurrencySnapshot}
                  tone={serviceTone(item.serviceId)}
                />
              ))}
            </div>
          ) : (
            <p className="type-meta">{t.admin.noServices}</p>
          )}
          <div className="panel-total">
            <span className="type-meta">
              {t.bookings.total} · {durationLabel}
            </span>
            <span className="type-title tnum">{formatPrice(total, currency, locale)}</span>
          </div>
        </section>

        <section className="panel-section" aria-label={t.bookings.noteLabel}>
          <h3 className="type-meta">{t.bookings.noteLabel}</h3>
          {booking.notes ? (
            <p className="panel-note type-body">{booking.notes}</p>
          ) : (
            <p className="type-meta">{t.bookings.noNote}</p>
          )}
        </section>

        <section className="panel-section">
          <p className="type-meta">
            {fmt(t.bookings.origin, {
              when: formatDateTime(booking.createdAt, locale, undefined, timeZone),
              source:
                booking.source === 'admin_manual'
                  ? t.bookings.viaMaster
                  : t.bookings.viaBookingPage,
            })}
          </p>
          {!closed && !started && booking.status !== 'pending' ? (
            <p className="type-meta">{t.bookings.completeAfterStart}</p>
          ) : null}
        </section>
      </div>
    </Sheet>
  );
}
