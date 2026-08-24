import { clientApiFetch } from '@/lib/client-api';

import type { PlatformHealth } from './types';

export function getPlatformHealth(): Promise<PlatformHealth> {
  return clientApiFetch<PlatformHealth>('/admin/health');
}
