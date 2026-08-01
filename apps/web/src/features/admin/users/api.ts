import { clientApiFetch } from '@/lib/client-api';

import type { AccountStatus, AdminUser, SystemRole } from './types';

export function listUsers(): Promise<AdminUser[]> {
  return clientApiFetch<AdminUser[]>('/admin/users');
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
