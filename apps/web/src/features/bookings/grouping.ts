import { useMemo } from 'react';

import { isCancelled, matchesFilter, type BookingFilter } from './filter';
import type { Booking } from './types';

export type GroupKey = 'pending' | 'today' | 'upcoming' | 'past' | 'cancelled';

export interface BookingGroup {
  key: GroupKey;
  all: Booking[];
}

/**
 * Ленты экрана записей: пять групп в порядке показа, каждая уже отсортирована.
 *
 * Чистой функцией, а не пятью `filter` в теле компонента. Причина не в
 * красоте: здесь пять проходов по всему списку, три сортировки и `Intl` на
 * каждую дату, и выполнялось это на каждую отрисовку — то есть и на каждое
 * нажатие клавиши в поиске, и на каждое «показать ещё». На истории салона за
 * третий год это залипающая клавиатура на телефоне.
 *
 * Вынос наружу заодно делает правило видимым и проверяемым: «что считается
 * ждущим», «где граница сегодня» — вопросы продукта, и разбирать их удобнее
 * там, где нет разметки.
 *
 * Порции («показать ещё») сюда не входят намеренно: они стоят одного `slice`,
 * а меняются от нажатий, которые случаются часто.
 */
export function groupBookings(
  bookings: Booking[],
  filter: BookingFilter,
  /** Сутки заведения в виде `YYYY-MM-DD` — граница «сегодня». */
  today: string,
  timeZone: string | undefined,
): BookingGroup[] {
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone });
  const dayOf = (iso: string) => dayFormat.format(new Date(iso));

  const byStart = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt);
  const byStartDesc = (a: Booking, b: Booking) => b.startsAt.localeCompare(a.startsAt);

  /* Ждущая ответа — только пока визит не прошёл: вчерашняя заявка без ответа
     это уже не работа на сегодня, а история. */
  const awaiting = (booking: Booking) =>
    booking.status === 'pending' && dayOf(booking.startsAt) >= today;

  const visible = bookings.filter((booking) => matchesFilter(booking.status, filter));
  const active = visible.filter((booking) => !isCancelled(booking.status) && !awaiting(booking));

  return [
    { key: 'pending', all: visible.filter(awaiting).sort(byStart) },
    {
      key: 'today',
      all: active.filter((booking) => dayOf(booking.startsAt) === today).sort(byStart),
    },
    {
      key: 'upcoming',
      all: active.filter((booking) => dayOf(booking.startsAt) > today).sort(byStart),
    },
    {
      key: 'past',
      all: active.filter((booking) => dayOf(booking.startsAt) < today).sort(byStartDesc),
    },
    {
      key: 'cancelled',
      all: visible.filter((booking) => isCancelled(booking.status)).sort(byStartDesc),
    },
  ];
}

/**
 * Ленты, пересчитанные только когда изменилось то, из чего они считаются.
 *
 * Хук отдельно от `groupBookings` и отдельно от экрана: разбор React Compiler
 * не берётся сохранять ручную мемоизацию там, где в теле компонента рядом
 * живут `Intl`-форматтеры и обработчики над теми же значениями, — и молча
 * отказывается оптимизировать компонент целиком. Здесь у аргументов нет иной
 * жизни, кроме этого вызова, и вопрос снимается.
 */
export function useBookingGroups(
  bookings: Booking[],
  filter: BookingFilter,
  today: string,
  timeZone: string | undefined,
): BookingGroup[] {
  return useMemo(
    () => groupBookings(bookings, filter, today, timeZone),
    [bookings, filter, today, timeZone],
  );
}
