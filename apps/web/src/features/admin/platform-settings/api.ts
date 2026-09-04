import { clientApiFetch } from '@/lib/client-api';

import type { PlatformSettingsResponse } from './types';

export function getPlatformSettings(): Promise<PlatformSettingsResponse> {
  return clientApiFetch<PlatformSettingsResponse>('/admin/platform-settings');
}

export function updatePlatformSettings(
  values: PlatformSettingsResponse,
): Promise<PlatformSettingsResponse> {
  return clientApiFetch<PlatformSettingsResponse>('/admin/platform-settings', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

/** Выключатель «опасной зоны» — сохраняется в момент переключения. */
export function setPlatformSwitch(
  key: 'maintenance_mode' | 'bookings_paused',
  on: boolean,
): Promise<PlatformSettingsResponse> {
  return updatePlatformSettings({ [key]: on ? '1' : '0' });
}
