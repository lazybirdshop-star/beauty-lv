import { clientApiFetch } from '@/lib/client-api';

import type { PlatformSettingsFormValues, PlatformSettingsResponse } from './types';

export function getPlatformSettings(): Promise<PlatformSettingsResponse> {
  return clientApiFetch<PlatformSettingsResponse>('/admin/platform-settings');
}

export function updatePlatformSettings(
  values: PlatformSettingsFormValues,
): Promise<PlatformSettingsResponse> {
  return clientApiFetch<PlatformSettingsResponse>('/admin/platform-settings', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}
