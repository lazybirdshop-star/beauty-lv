import { clientApiFetch } from '@/lib/client-api';

import type { AuditLogEntry } from './types';

export function listAuditLog(): Promise<AuditLogEntry[]> {
  return clientApiFetch<AuditLogEntry[]>('/admin/logs');
}
