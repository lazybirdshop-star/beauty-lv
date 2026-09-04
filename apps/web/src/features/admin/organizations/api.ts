import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AdminOrganization, AdminOrganizationsFilters, OrganizationStatus } from './types';

/**
 * Страница списка салонов. `withTeam` считает всю платформу, а не отбор: в
 * шапке это вторая половина фразы «143 организации · 31 с командой».
 */
export interface AdminOrganizationsPage extends AdminListPage<AdminOrganization> {
  withTeam?: number;
}

export function listOrganizations(
  params: AdminOrganizationsFilters & { query?: string; limit: number; offset: number },
): Promise<AdminOrganizationsPage> {
  return clientApiFetch<AdminOrganizationsPage>(`/admin/organizations?${toSearchParams(params)}`);
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
