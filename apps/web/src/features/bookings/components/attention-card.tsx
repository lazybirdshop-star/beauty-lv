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

            {/*
             * Имя отдельной строкой, всё остальное — второй.
             *
             * Строка «имя · услуга · длительность» на телефоне не помещалась
             * никогда, а поскольку текст и обе кнопки делили ширину поровну,
             * ему доставалась треть: имя рассыпалось по одному слову в строку,
             * и две ждущие записи занимали весь первый экран, оставаясь
             * нечитаемыми. Теперь текст держит свою строку целиком, кнопки
             * уходят под неё.
             */}
            <div className="col attention__who">
              <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {formatDateTime(
                  booking.startsAt,
                  locale,
                  { weekday: 'short', day: 'numeric', month: 'short' },
                  timeZone,
                )}
                {' · '}
                {service}
                {' · '}
                {fmt(t.bookings.durationShort, { minutes })}
              </span>
            </div>

            <div className="attention__actions">
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
          </div>
        );
      })}
    </section>
  );
}
