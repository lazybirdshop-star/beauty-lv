import { clientApiFetch } from '@/lib/client-api';

import type { Booking, BookingStatus, CreateBookingInput } from './types';

export function listBookings(slug: string): Promise<Booking[]> {
  return clientApiFetch<Booking[]>(`/organizations/${slug}/bookings`);
}

export function createBooking(slug: string, input: CreateBookingInput): Promise<Booking> {
  return clientApiFetch<Booking>(`/organizations/${slug}/bookings`, {
    method: 'POST',
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
