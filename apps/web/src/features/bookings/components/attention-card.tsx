'use client';

/**
 * «Требует ответа» — янтарная карточка из артборда `Bookings.dc.html`.
 *
 * Стоит выше фильтров и выше таблицы, потому что это единственное на экране,
 * что нельзя отложить: пока запись не подтверждена, клиент не знает, придёт
 * он или нет. Янтарная, а не красная: красный в кабинете значит «сломалось»,
 * а здесь ничего не сломалось — просто ждут.
 *
 * Два действия прямо в строке. Подтвердить — одно нажатие: отказ отсюда
 * уходит в тот же лист подтверждения, что и отмена из таблицы, потому что
 * отказ видит клиент.
 */
import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { Booking } from '../types';
import { initials } from '@/lib/avatar';

/** Инициалы клиента для кружка. */
export function AttentionCard({
  bookings,
  onConfirm,
  onDecline,
  busyId,
}: {
  bookings: Booking[];
  onConfirm: (booking: Booking) => void;
  onDecline: (booking: Booking) => void;
  busyId: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  if (bookings.length === 0) return null;

  return (
    <section className="attention" aria-label={t.bookings.needsAttention}>
      <div className="row" style={{ gap: 10, padding: '14px 18px 10px' }}>
        <Icon name="alert" className="ico-18" />
        <span style={{ fontWeight: 600 }}>{t.bookings.needsAttention}</span>
        <span className="t-meta">
          {fmt(t.bookings.needsAttentionCount, { count: bookings.length })}
        </span>
      </div>

      {bookings.map((booking) => {
        const name = booking.guestName || t.home.guest;
        const service = booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
        const minutes =
          booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;

        return (
          <div className="attention__row" key={booking.id}>
            <span className="avatar" aria-hidden="true">
              {initials(name)}
            </span>

            <div className="col" style={{ gap: 1, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {name} · {service} · {fmt(t.bookings.durationShort, { minutes })}
              </span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {formatDateTime(
                  booking.startsAt,
                  locale,
                  { day: 'numeric', month: 'short' },
                  timeZone,
                )}
                {' · '}
                {booking.source === 'public_page'
                  ? t.bookings.viaBookingPage
                  : t.bookings.viaMaster}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onDecline(booking)}
              disabled={busyId === booking.id}
            >
              {t.bookings.decline}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onConfirm(booking)}
              disabled={busyId === booking.id}
            >
              <Icon name="check" className="ico-16" />
              <span>{t.bookings.confirm}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
