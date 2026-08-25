import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage, type AdminListParams } from '../shared/types';
import type { AccountStatus, AdminMaster, AdminMasterDetail } from './types';

export function listMasters(params: AdminListParams): Promise<AdminListPage<AdminMaster>> {
  return clientApiFetch<AdminListPage<AdminMaster>>(`/admin/masters?${toSearchParams(params)}`);
}

export function getMaster(userId: string): Promise<AdminMasterDetail> {
  return clientApiFetch<AdminMasterDetail>(`/admin/masters/${userId}`);
}

/**
 * Вход в кабинет мастера идёт не через прокси API, а через свой обработчик:
 * он обменивает куки — токен администратора уезжает в соседнюю, а на его
 * место встаёт токен поддержки. Прокси умеет только пересылать запрос.
 */
export function impersonateMaster(
  masterId: string,
): Promise<{ redirectUrl: string; masterName: string }> {
  return fetch('/api/admin/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterId }),
  }).then(async (response) => {
    if (!response.ok) throw new Error('Не удалось войти в кабинет мастера');
    return response.json() as Promise<{ redirectUrl: string; masterName: string }>;
  });
}

export function deleteMaster(userId: string): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>(`/admin/masters/${userId}`, { method: 'DELETE' });
}

/** Выгрузка идёт файлом, поэтому ответ читается как есть, а не как модель. */
export function exportMaster(userId: string): Promise<unknown> {
  return clientApiFetch<unknown>(`/admin/masters/${userId}/export`);
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
