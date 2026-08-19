import type { Booking } from './types';

/** Ниже этого числа всё умещается на экран-другой, и поле поиска — мебель. */
export const SEARCH_THRESHOLD = 8;

/** Только цифры: запись хранит то, что набрал гость, адресная книга — нормализованный номер. */
function digitsOf(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

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

  const digits = trimmed.replace(/\D/g, '');

  return bookings.filter((booking) => {
    const name = (booking.guestName ?? '').toLowerCase();
    const services = booking.items
      .map((item) => item.serviceNameSnapshot)
      .join(' ')
      .toLowerCase();
    const phone = digitsOf(booking.guestPhone);
    return (
      name.includes(trimmed) ||
      services.includes(trimmed) ||
      (digits.length > 0 && phone.includes(digits))
    );
  });
}
