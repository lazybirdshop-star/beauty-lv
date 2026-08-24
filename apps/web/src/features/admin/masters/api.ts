import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage, type AdminListParams } from '../shared/types';
import type { AccountStatus, AdminMaster, AdminMasterDetail } from './types';

export function listMasters(params: AdminListParams): Promise<AdminListPage<AdminMaster>> {
  return clientApiFetch<AdminListPage<AdminMaster>>(`/admin/masters?${toSearchParams(params)}`);
}

export function getMaster(userId: string): Promise<AdminMasterDetail> {
  return clientApiFetch<AdminMasterDetail>(`/admin/masters/${userId}`);
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
