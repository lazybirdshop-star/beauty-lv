'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { TimeFigure } from '@/features/bookings/components/time-figure';
import { telLink } from '@/features/bookings/contact-links';
import type { Booking } from '@/features/bookings/types';
import { initials } from '@/lib/avatar';
import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useNow } from '@/lib/use-now';

/**
 * Сейчас / дальше — герой главной (Design System V2 §8, H3).
 *
 * «Следующая · через 18 мин» розовыми чернилами, крупная цифра времени с
 * полосой услуги, клиент · услуга · длительность, в салоне — «с Юлией»;
 * справа «Позвонить» и «Написать». Идущий визит — «Сейчас в кресле · до
 * 11:30». Живёт нишей внутри шапки дня, а не поднятой карточкой: это часть
 * ответа «как лежит сегодня», а не отдельный предмет на столе.
 *
 * Минуты до визита тикают в браузере: на сервере часов нет, и первый кадр
 * приходит без строки «через N мин», а не с враньём.
 */
export function NextVisitCard({
  booking,
  tone,
  memberName,
  onOpen,
}: {
  booking: Booking;
  tone: string;
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
  const services = booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
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
      const left = Math.max(1, Math.round((start - now) / 60_000));
      const duration = formatDuration(left, {
        hoursShort: t.common.hoursShort,
        minutesShort: t.common.minutesShort,
      });
      lead = memberName
        ? fmt(t.workspace.nextArrival, { duration })
        : fmt(t.home.nextBadge, { duration });
    }
  }

  return (
    <Card elevation="flat" className="home-next" aria-label={t.home.nextVisit}>
      <span className="avatar home-next__portrait" aria-hidden="true">
        {initials(clientName, '?')}
      </span>

      <div className="home-next__body">
        {lead ? <p className="home-next__lead type-dense">{lead}</p> : null}
        <button type="button" className="home-next__open" onClick={onOpen}>
          <TimeFigure
            startsAt={booking.startsAt}
            minutes={minutes}
            tone={tone}
            line={
              <>
                <span className="text-ink">{clientName}</span>
                {' · '}
                {services}
                {' · '}
                {formatDuration(minutes, {
                  hoursShort: t.common.hoursShort,
                  minutesShort: t.common.minutesShort,
                })}
                {price ? ` · ${price}` : ''}
              </>
            }
          />
        </button>
        {memberName ? (
          <p className="type-meta home-next__member">
            {fmt(t.workspace.withMember, { name: memberName })}
          </p>
        ) : null}
        {booking.notes ? <p className="type-dense home-next__note">“{booking.notes}”</p> : null}
      </div>
      <div className="home-next__actions">
        {/* «Открыть» первой: карточка визита — это и перенос, и отмена, и
            заметка, а звонок из неё всё равно в одном нажатии. Телефон рядом
            значком — для того единственного случая, когда клиент опаздывает
            и звонить надо сейчас. */}
        <Button variant="raised" size="sm" onClick={onOpen}>
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
    </Card>
  );
}
