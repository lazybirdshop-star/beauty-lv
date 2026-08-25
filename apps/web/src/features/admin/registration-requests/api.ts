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

/**
 * Чем закончилось одобрение.
 *
 * Два исхода, а не один: кабинет либо заведён, либо появится после того, как
 * человек подтвердит переход по ссылке из письма — так бывает, когда на этот
 * адрес уже был аккаунт клиента. Различать их по наличию слуга значило бы
 * строить ветвление на совпадении.
 */
export type ApprovalResult =
  | { mode: 'created'; userId: string; organizationSlug: string }
  | { mode: 'confirmation-sent'; email: string };

export function approveRequest(requestId: string): Promise<ApprovalResult> {
  return clientApiFetch<ApprovalResult>(`/admin/registration-requests/${requestId}/approve`, {
    method: 'POST',
  });
}

export function rejectRequest(requestId: string, reason: string): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>(`/admin/registration-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
