import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AdminBooking, BookingStatus } from './types';

export interface AdminBookingsParams {
  query?: string;
  status?: BookingStatus;
  limit: number;
  offset: number;
}

export function listAdminBookings(
  params: AdminBookingsParams,
): Promise<AdminListPage<AdminBooking>> {
  return clientApiFetch<AdminListPage<AdminBooking>>(`/admin/bookings?${toSearchParams(params)}`);
}
