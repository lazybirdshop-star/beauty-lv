import { clientApiFetch } from '@/lib/client-api';

export interface CreateGuestBookingInput {
  publishedSlotId: string;
  serviceId: string;
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
