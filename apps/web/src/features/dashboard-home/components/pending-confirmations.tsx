import Link from 'next/link';

import type { Booking } from '@/features/bookings/types';
import { formatUpcomingVisit } from '@/lib/format';
import type { Messages } from '@/lib/i18n/messages';

/** Сколько строк помещается в плашку; остальные — по ссылке «Все». */
const SHOWN = 5;

/**
 * Плашка «Ожидают подтверждения» — первой на «Сегодня», над днём.
 *
 * Все непринятые записи, а не только сегодняшние: клиент записался со страницы
 * на субботу, и ответить ему надо сейчас, а не в субботу утром. Прежняя
 * «Сегодня» показывала непринятые только за текущие сутки — запись на
 * послезавтра не было видно на главной вовсе, пока она не протухала.
 *
 * Строка ведёт в карточку записи, где стоят «Подтвердить» и «Отклонить»:
 * решение принимается там, где видны услуги, контакты и заметка клиента.
 */
export function PendingConfirmations({
  bookings,
  base,
  locale,
  timeZone,
  t,
}: {
  bookings: Booking[];
  base: string;
  locale: string;
  timeZone: string;
  t: Messages;
}) {
  if (bookings.length === 0) return null;

  return (
    <section className="today-pending" aria-labelledby="today-pending-title">
      <div className="today-section-head">
        <h2 id="today-pending-title" className="t-section today-pending__title">
          {t.workspace.pending}
          <span className="badge b-neutral tnum">{bookings.length}</span>
        </h2>
        {bookings.length > SHOWN ? (
          <Link href={`${base}/calendar?view=list`}>{t.home.all}</Link>
        ) : null}
      </div>
      <ul>
        {bookings.slice(0, SHOWN).map((booking) => (
          <li key={booking.id}>
            <Link className="today-pending__row" href={`${base}/bookings?booking=${booking.id}`}>
              <span className="today-pending__who">
                <span className="t-strong">{booking.guestName || t.home.guest}</span>
                <span className="t-meta">
                  {booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
                </span>
              </span>
              <span className="today-pending__when tnum">
                {formatUpcomingVisit(booking.startsAt, locale, timeZone)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
