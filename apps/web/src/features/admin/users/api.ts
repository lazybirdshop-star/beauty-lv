import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AccountStatus, AdminUser, AdminUsersFilters, SystemRole } from './types';

export function listUsers(
  params: AdminUsersFilters & { query?: string; limit: number; offset: number },
): Promise<AdminListPage<AdminUser>> {
  return clientApiFetch<AdminListPage<AdminUser>>(`/admin/users?${toSearchParams(params)}`);
}

export function setUserStatus(userId: string, accountStatus: AccountStatus): Promise<AdminUser> {
  return clientApiFetch<AdminUser>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ accountStatus }),
  });
}

export function setUserRole(userId: string, systemRole: SystemRole): Promise<AdminUser> {
  return clientApiFetch<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ systemRole }),
  });
}
