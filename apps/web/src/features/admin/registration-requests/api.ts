import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AdminRegistrationRequest, RegistrationRequestStatus } from './types';

export interface RegistrationRequestsParams {
  query?: string;
  status?: RegistrationRequestStatus;
  limit: number;
  offset: number;
}

export function listRegistrationRequests(
  params: RegistrationRequestsParams,
): Promise<AdminListPage<AdminRegistrationRequest>> {
  return clientApiFetch<AdminListPage<AdminRegistrationRequest>>(
    `/admin/registration-requests?${toSearchParams(params)}`,
  );
}

export function countPendingRequests(): Promise<{ count: number }> {
  return clientApiFetch<{ count: number }>('/admin/registration-requests/pending-count');
}

export function approveRequest(
  requestId: string,
): Promise<{ userId: string; organizationSlug: string }> {
  return clientApiFetch<{ userId: string; organizationSlug: string }>(
    `/admin/registration-requests/${requestId}/approve`,
    { method: 'POST' },
  );
}

export function rejectRequest(requestId: string, reason: string): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>(`/admin/registration-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
