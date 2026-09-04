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

/** Отборы таблицы записей — те же значения, что принимает API. */
export type BookingOwnerFilter = 'all' | 'solo' | 'salon';
export type BookingDateFilter = 'today' | 'week' | 'month' | 'all';
export type BookingSourceFilter = 'all' | 'public_page' | 'admin_manual' | 'marketplace';

export interface AdminBookingsFilters extends Record<string, string | number | undefined> {
  status?: BookingStatus;
  source?: Exclude<BookingSourceFilter, 'all'>;
  ownerType?: Exclude<BookingOwnerFilter, 'all'>;
  from?: string;
  to?: string;
}
