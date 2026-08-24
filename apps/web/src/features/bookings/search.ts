import { searchableDigits } from '@/lib/list-search';

import type { Booking } from './types';

/**
 * Поиск по списку записей — второй вопрос экрана.
 *
 * Фильтр отвечает «что мне сейчас делать», поиск — «а что там было у Анны», и
 * свёрнутая группа прошедших делает второй вопрос без него неразрешимым: до
 * записи полугодовой давности просто не долистать.
 *
 * Имя и услуга ищутся по тексту, телефон — по одним цифрам, поэтому «+371 20»
 * находит «+37120000111». Пустой запрос — не фильтр: возвращается всё.
 */
export function searchBookings(bookings: Booking[], query: string): Booking[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return bookings;

  const digits = searchableDigits(trimmed);

  return bookings.filter((booking) => {
    const name = (booking.guestName ?? '').toLowerCase();
    const services = booking.items
      .map((item) => item.serviceNameSnapshot)
      .join(' ')
      .toLowerCase();
    const phone = searchableDigits(booking.guestPhone);
    return (
      name.includes(trimmed) ||
      services.includes(trimmed) ||
      (digits.length > 0 && phone.includes(digits))
    );
  });
}
