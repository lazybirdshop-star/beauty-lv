'use client';

import { Card } from '@/components/ui/card';
import { ContactActions } from '@/features/bookings/components/contact-actions';
import { TimeFigure } from '@/features/bookings/components/time-figure';
import type { Booking } from '@/features/bookings/types';
import { formatDuration, formatTime } from '@/lib/format';
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
 * 11:30». Единственный предмет главной с сильным подъёмом.
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
    <Card elevation="lead" className="home-next" aria-label={t.home.nextVisit}>
      <div className="home-next__body">
        {lead ? <p className="home-next__lead type-dense">{lead}</p> : null}
        <button type="button" className="home-next__open" onClick={onOpen}>
          <TimeFigure
            startsAt={booking.startsAt}
            minutes={minutes}
            tone={tone}
            line={
              <>
                <span className="text-ink">{booking.guestName || t.home.guest}</span>
                {' · '}
                {services}
                {' · '}
                {formatDuration(minutes, {
                  hoursShort: t.common.hoursShort,
                  minutesShort: t.common.minutesShort,
                })}
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
      <ContactActions
        phone={booking.guestPhone}
        instagram={booking.guestInstagram}
        layout="column"
        className="home-next__actions"
      />
    </Card>
  );
}
