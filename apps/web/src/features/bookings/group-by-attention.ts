import { todayKey } from '@/lib/civil-date';
import { dayKey } from '@/lib/format';
import type { Messages } from '@/lib/i18n/messages';

import type { Booking, BookingStatus } from './types';

export interface BookingGroup {
  key: 'pending' | 'today' | 'upcoming' | 'past';
  title: string;
  hint?: string;
  items: Booking[];
}

/**
 * Статусы, после которых от записи уже ничего не требуется: она либо
 * состоялась, либо не состоится. Именно они, а не дата, отправляют запись в
 * архив — завтрашняя отменённая запись ждать нечего.
 */
const SETTLED_STATUSES: readonly BookingStatus[] = [
  'completed',
  'no_show',
  'cancelled_by_client',
  'cancelled_by_master',
];

function isSettled(status: BookingStatus): boolean {
  return SETTLED_STATUSES.includes(status);
}

/**
 * Записи, разложенные по тому, что мастеру с ними делать, а не по названию
 * статуса: ждут ответа → сегодня → дальше → прошедшие.
 *
 * Плоский список по дате хоронит единственную запись, требующую ответа
 * сегодня, среди сотни, которая ответа не требует, а фильтр «Новые» помогает
 * только тому, кто уже знает, что туда надо смотреть.
 *
 * Вынесено из экрана отдельным модулем: правило раскладки — решение продукта,
 * а не деталь разметки, и проверяется оно само по себе.
 *
 * Сутки принадлежат салону, а не устройству: «сегодня» на главной и «Сегодня»
 * здесь обязаны означать один и тот же день, иначе одна и та же запись
 * оказывается в разных сутках на соседних экранах. Сравниваются гражданские
 * даты, а не моменты, — границы суток считать не нужно.
 */
export function groupByAttention(
  bookings: Booking[],
  t: Messages,
  timeZone?: string,
): BookingGroup[] {
  const today = todayKey(timeZone);

  const pending: Booking[] = [];
  const todays: Booking[] = [];
  const upcoming: Booking[] = [];
  const past: Booking[] = [];

  for (const booking of bookings) {
    const day = dayKey(booking.startsAt, timeZone);
    if (booking.status === 'pending') pending.push(booking);
    else if (isSettled(booking.status) || day < today) past.push(booking);
    else if (day === today) todays.push(booking);
    else upcoming.push(booking);
  }

  const byTime = (a: Booking, b: Booking) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

  return (
    [
      {
        key: 'pending',
        title: t.bookings.groupPending,
        hint: t.bookings.groupPendingHint,
        items: pending.sort(byTime),
      },
      { key: 'today', title: t.bookings.groupToday, items: todays.sort(byTime) },
      { key: 'upcoming', title: t.bookings.groupUpcoming, items: upcoming.sort(byTime) },
      /* Прошедшие — сверху самые свежие: архив читают с конца. */
      { key: 'past', title: t.bookings.groupPast, items: past.sort(byTime).reverse() },
    ] as BookingGroup[]
  ).filter((group) => group.items.length > 0);
}
