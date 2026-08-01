import { clientApiFetch } from '@/lib/client-api';

import type { AccountStatus, AdminMaster } from './types';

export function listMasters(): Promise<AdminMaster[]> {
  return clientApiFetch<AdminMaster[]>('/admin/masters');
}

export function setMasterStatus(
  userId: string,
  accountStatus: AccountStatus,
): Promise<AdminMaster> {
  return clientApiFetch<AdminMaster>(`/admin/masters/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ accountStatus }),
  });
}
