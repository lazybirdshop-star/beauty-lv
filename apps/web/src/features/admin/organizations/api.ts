import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AdminOrganization, OrganizationStatus } from './types';

export interface AdminOrganizationsParams {
  query?: string;
  status?: OrganizationStatus;
  limit: number;
  offset: number;
}

export function listOrganizations(
  params: AdminOrganizationsParams,
): Promise<AdminListPage<AdminOrganization>> {
  return clientApiFetch<AdminListPage<AdminOrganization>>(
    `/admin/organizations?${toSearchParams(params)}`,
  );
}

export function setOrganizationStatus(
  organizationId: string,
  status: OrganizationStatus,
): Promise<AdminOrganization> {
  return clientApiFetch<AdminOrganization>(`/admin/organizations/${organizationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
