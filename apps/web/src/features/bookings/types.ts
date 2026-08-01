export type BookingStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled_by_client' | 'cancelled_by_master' | 'no_show';

export interface BookingItem {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceNameSnapshot: string;
  durationMinutesSnapshot: number;
  priceAmountSnapshot: number;
  priceCurrencySnapshot: string;
}

export interface Booking {
  id: string;
  organizationId: string;
  organizationMemberId: string;
  publishedSlotId: string;
  clientUserId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestInstagram: string | null;
  status: BookingStatus;
  cancellationReason: string | null;
  source: 'public_page' | 'admin_manual' | 'marketplace';
  notes: string | null;
  startsAt: string;
  items: BookingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  publishedSlotId: string;
  serviceId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
}
