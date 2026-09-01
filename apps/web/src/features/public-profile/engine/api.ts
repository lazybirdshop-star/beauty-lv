import { clientApiFetch } from '@/lib/client-api';

export interface CreateGuestBookingInput {
  publishedSlotId: string;
  /** A visit may combine services; the window it blocks is as long as all of them. */
  serviceIds: string[];
  guestName: string;
  guestPhone: string;
  /**
   * Куда придёт ответ мастера. Необязательный, и это цена, которую платит
   * форма: адрес, вырванный требованием, чаще выдуман, чем набран.
   * Оставившего его человека дальше ведёт письмо, не оставившего — память
   * этого устройства.
   */
  guestEmail?: string;
  guestInstagram?: string;
}

export interface CreatedGuestBooking {
  /** The visitor's only key to their own booking — status page and calendar file both hang off it. */
  publicToken: string;
  /** `confirmed` straight away when the master books on trust; otherwise `pending`. */
  status: 'pending' | 'confirmed';
  startsAt: string;
}

/** Guests have no cookie at all — the BFF proxy forwards the request anonymously, the backend route itself requires no auth. */
export function createGuestBooking(
  slug: string,
  input: CreateGuestBookingInput,
): Promise<CreatedGuestBooking> {
  return clientApiFetch<CreatedGuestBooking>(`/organizations/${slug}/public-bookings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Exported for `use-booking-flow`: the availability answer is its input. */
export interface ApiSlot {
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
