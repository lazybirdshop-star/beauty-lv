'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { telLink } from '@/features/bookings/contact-links';
import type { Booking } from '@/features/bookings/types';
import { initials } from '@/lib/avatar';
import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useNow } from '@/lib/use-now';

/**
 * Сейчас / дальше — `.hero-next` прототипа «Кабинет 2026».
 *
 * Ниша внутри шапки дня: лицо клиента, крупное время начала антиквой и под
 * ним «через 25 мин» (в салоне — и к кому), имя, услуга · длительность · цена
 * · заметка; справа «Открыть» и звонок. Идущий визит — «Сейчас в кресле · до
 * 11:30».
 *
 * Минуты до визита тикают в браузере: на сервере часов нет, и первый кадр
 * приходит без строки «через N мин», а не с враньём.
 */
export function NextVisitCard({
  booking,
  memberName,
  onOpen,
}: {
  booking: Booking;
  /** Имя мастера — в командном режиме карточка называет, к кому идут. */
  memberName?: string;
  onOpen: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const now = useNow();
  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
  const start = new Date(booking.startsAt).getTime();
  const end = start + minutes * 60_000;
  const duration = (value: number) =>
    formatDuration(value, {
      hoursShort: t.common.hoursShort,
      minutesShort: t.common.minutesShort,
    });
  /* Цена визита — сумма снимков услуг: прайс мог измениться после записи, а
     клиент придёт по той цене, о которой договорились. */
  const currency = booking.items[0]?.priceCurrencySnapshot;
  const price = currency
    ? formatPrice(
        booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0),
        currency,
        locale,
      )
    : null;
  const clientName = booking.guestName || t.home.guest;

  let lead: string | null = null;
  if (now !== null) {
    if (start <= now && end > now) {
      lead = `${t.workspace.inChairNow} · ${fmt(t.workspace.untilTime, { time: formatTime(new Date(end).toISOString(), locale, timeZone) })}`;
    } else if (start > now) {
      lead = fmt(t.home.nextBadge, {
        duration: duration(Math.max(1, Math.round((start - now) / 60_000))),
      });
    }
  }
  if (lead && memberName) lead = `${lead} · ${memberName}`;

  const line = [
    booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
    duration(minutes),
    price,
    booking.notes ? `«${booking.notes}»` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="home-next" role="group" aria-label={t.home.nextVisit}>
      <span className="avatar home-next__portrait" aria-hidden="true">
        {initials(clientName, '?')}
      </span>

      <button type="button" className="home-next__open" onClick={onOpen}>
        <span className="home-next__time">
          <span className="home-next__big tnum">
            {formatTime(booking.startsAt, locale, timeZone)}
          </span>
          {lead ? <small className="home-next__lead">{lead}</small> : null}
        </span>
        <span className="home-next__name">{clientName}</span>
        <span className="home-next__line">{line}</span>
      </button>

      <div className="home-next__actions">
        <Button variant="secondary" size="sm" onClick={onOpen}>
          {t.workspace.openBooking}
        </Button>
        {booking.guestPhone ? (
          <Button asChild variant="ghost" size="icon" aria-label={t.bookings.callClient}>
            <a href={telLink(booking.guestPhone)}>
              <Icon name="phone" className="ico-18" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
