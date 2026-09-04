import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AdminBooking, AdminBookingsFilters } from './types';

export function listAdminBookings(
  params: AdminBookingsFilters & { query?: string; limit: number; offset: number },
): Promise<AdminListPage<AdminBooking>> {
  return clientApiFetch<AdminListPage<AdminBooking>>(`/admin/bookings?${toSearchParams(params)}`);
}
