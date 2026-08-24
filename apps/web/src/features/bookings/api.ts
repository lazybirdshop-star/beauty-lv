import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { Booking, BookingStatus, CreateBookingInput, UpdateBookingInput } from './types';

/** Чем экран сужает список: отрезок времени и/или один статус. */
export interface BookingsFilter extends TimeWindow {
  status?: BookingStatus;
}

/**
 * Записи мастера, при желании — только за отрезок времени и/или в одном статусе.
 *
 * Без сита ответ прежний: вся история. Сито передаёт тот экран, которому
 * заведомо нужен день, неделя или один статус, — платить мегабайтами за один
 * вечер (и тем более за одно число в бейдже) незачем.
 */
export function listBookings(slug: string, filter: BookingsFilter = {}): Promise<Booking[]> {
  const query = timeWindowQuery(filter);
  const status = filter.status ? `${query ? '&' : '?'}status=${filter.status}` : '';
  return clientApiFetch<Booking[]>(`/organizations/${slug}/bookings${query}${status}`);
}

export function createBooking(slug: string, input: CreateBookingInput): Promise<Booking> {
  return clientApiFetch<Booking>(`/organizations/${slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Правка записи: состав услуг, контакты, заметка.
 *
 * Свой маршрут, отдельный от смены статуса: «подтвердить» и «дописать услугу» —
 * два разных решения с разными причинами отказа, и второе может не пройти по
 * занятости окон уже после того, как первое применилось.
 */
export function updateBookingDetails(
  slug: string,
  bookingId: string,
  input: UpdateBookingInput,
): Promise<Booking> {
  return clientApiFetch<Booking>(`/organizations/${slug}/bookings/${bookingId}/details`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateBookingStatus(
  slug: string,
  bookingId: string,
  status: BookingStatus,
  cancellationReason?: string,
): Promise<Booking> {
  return clientApiFetch<Booking>(`/organizations/${slug}/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, cancellationReason }),
  });
}
