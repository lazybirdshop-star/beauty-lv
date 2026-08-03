import { clientApiFetch } from '@/lib/client-api';

export interface CreateGuestBookingInput {
  publishedSlotId: string;
  /** A visit may combine services; the window it blocks is as long as all of them. */
  serviceIds: string[];
  guestName: string;
  guestPhone: string;
  guestInstagram?: string;
}

/** Guests have no cookie at all — the BFF proxy forwards the request anonymously, the backend route itself requires no auth. */
export function createGuestBooking(slug: string, input: CreateGuestBookingInput): Promise<unknown> {
  return clientApiFetch(`/organizations/${slug}/public-bookings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

interface ApiSlot {
  id: string;
  startsAt: string;
  status: 'available' | 'booked';
}

/**
 * Windows a visit of this length actually fits into. Fetched from the
 * browser rather than rendered on the server because the length only exists
 * once the client has assembled a cart.
 */
export function fetchAvailability(slug: string, durationMinutes: number): Promise<ApiSlot[]> {
  return clientApiFetch<ApiSlot[]>(
    `/organizations/${slug}/public-availability?durationMinutes=${durationMinutes}`,
  );
}
