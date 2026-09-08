'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { avatarTint, initials } from '@/lib/avatar';
import { formatDateTime, formatPhone, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { getBookingStatusMeta } from '../status-meta';
import type { Booking, BookingStatus } from '../types';

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

/** Визит закрыт: подтверждать, завершать и переносить больше нечего. */
const CLOSED: BookingStatus[] = [
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
  'expired',
];

/**
 * Что за запись — до того, как её начнут менять.
 *
 * Нажатие на строку открывало форму правки: мастер, заглянувшая посмотреть,
 * «во сколько там Анна», сразу оказывалась в полях ввода — и закрывала их, не
 * прочитав ничего. Сначала ответ на вопрос, потом инструменты.
 *
 * Действия здесь те, которых экрану не хватало вовсе: «Завершить», «Не
 * пришёл» и «Отменить». Раньше запись можно было только подтвердить — и
 * только из янтарной карточки наверху.
 *
 * Порядок действий следует состоянию визита: у ждущей записи главный вопрос
 * «приму ли я её», у подтверждённой — «состоялся ли визит», а у закрытой не
 * остаётся ни одного: её уже нельзя ни завершить, ни перенести.
 */
export function BookingDetailSheet({
  open,
  onOpenChange,
  booking,
  busy,
  onSetStatus,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  busy: boolean;
  onSetStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t);

  if (!booking) {
    return (
      <SideSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t.bookings.detailTitle}
        closeLabel={t.common.close}
      >
        <p className="t-meta">{t.bookings.notFound}</p>
      </SideSheet>
    );
  }

  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const status = meta[booking.status];
  const closed = CLOSED.includes(booking.status);

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.detailTitle}
      subtitle={formatDateTime(
        booking.startsAt,
        locale,
        { weekday: 'short', day: 'numeric', month: 'short' },
        timeZone,
      )}
      closeLabel={t.common.close}
      footer={
        closed ? (
          <span className="t-meta">{t.bookings.doneHint}</span>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onEdit(booking)}>
            <Icon name="edit" className="ico-18" />
            <span>{t.bookings.editBooking}</span>
          </button>
        )
      }
    >
      <div className="row" style={{ gap: 12 }}>
        <span
          className="avatar"
          style={{ width: 44, height: 44, fontSize: 17, ...avatarTint(booking.id) }}
        >
          {initials(booking.guestName ?? '?')}
        </span>
        <div className="col" style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {booking.guestName ?? t.admin.noName}
          </span>
          {booking.guestPhone ? (
            <a className="t-meta" href={`tel:${booking.guestPhone}`}>
              {formatPhone(booking.guestPhone)}
            </a>
          ) : null}
        </div>
        {booking.guestPhone ? (
          <a
            className="btn btn-secondary btn-icon"
            href={`tel:${booking.guestPhone}`}
            aria-label={t.bookings.callClient}
          >
            <Icon name="phone" className="ico-18" />
          </a>
        ) : null}
      </div>

      <div className="card booking-facts">
        <div className="col">
          <span className="t-label">{t.bookings.colService}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {booking.items.map((item) => item.serviceNameSnapshot).join(' + ') ||
              t.admin.noServices}
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.clients.colDuration}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {minutes} {t.common.minutesShort} · {formatPrice(total, currency, locale)}
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.admin.colStatus}</span>
          <span>
            <span className={`badge ${badgeClass(status.tone)}`}>
              <span className="dot" />
              {status.label}
            </span>
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.bookings.colCreated}</span>
          <span style={{ fontSize: 13.5 }}>
            {formatDateTime(booking.createdAt, locale, undefined, timeZone)}
          </span>
        </div>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="t-label">{t.bookings.noteLabel}</span>
        {booking.notes ? (
          <p style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>
            {booking.notes}
          </p>
        ) : (
          <p className="t-meta">{t.bookings.noNote}</p>
        )}
      </div>

      {closed ? null : (
        <div className="col booking-actions">
          {booking.status === 'pending' ? (
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-ink"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => onSetStatus(booking, 'confirmed')}
              >
                <Icon name="check" className="ico-18" />
                <span>{t.bookings.confirm}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => onSetStatus(booking, 'cancelled_by_master')}
              >
                <span>{t.bookings.decline}</span>
              </button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              {/* «Завершить» — главное действие прошедшего визита: по нему
                  считается доход, и без него он не попадёт в финансы. */}
              <button
                type="button"
                className="btn btn-ink"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => onSetStatus(booking, 'completed')}
              >
                <Icon name="check" className="ico-18" />
                <span>{t.bookings.markCompleted}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => onSetStatus(booking, 'no_show')}
              >
                <span>{t.bookings.markNoShow}</span>
              </button>
            </div>
          )}

          {/* Отмена отделена линией: у неё нет обратной кнопки, и стоять в
              одном ряду с «Завершить» она не должна. */}
          <div className="row booking-danger">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => onSetStatus(booking, 'cancelled_by_master')}
            >
              <Icon name="x" className="ico-18" />
              <span>{t.bookings.cancelBooking}</span>
            </button>
            <span className="t-meta" style={{ fontSize: 12 }}>
              {t.bookings.asksConfirmation}
            </span>
          </div>
        </div>
      )}
    </SideSheet>
  );
}
