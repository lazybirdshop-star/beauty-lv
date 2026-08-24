import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage, type AdminListParams } from '../shared/types';
import type { AccountStatus, AdminUser, SystemRole } from './types';

export interface AdminUsersParams extends AdminListParams {
  role?: SystemRole;
}

export function listUsers(params: AdminUsersParams): Promise<AdminListPage<AdminUser>> {
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
