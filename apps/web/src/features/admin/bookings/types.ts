import type { BookingStatus } from '@/features/bookings/types';

export type { BookingStatus };

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  source: 'public_page' | 'admin_manual' | 'marketplace';
  startsAt: string;
  createdAt: string;
  guestName: string | null;
  guestPhone: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  totalAmount: number;
  serviceNames: string[];
}
