import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type { AuditLogEntry } from './types';

export interface AuditLogParams {
  query?: string;
  action?: string;
  limit: number;
  offset: number;
}

export function listAuditLog(params: AuditLogParams): Promise<AdminListPage<AuditLogEntry>> {
  return clientApiFetch<AdminListPage<AuditLogEntry>>(`/admin/logs?${toSearchParams(params)}`);
}

/** Сита собираются из самих данных: новое действие появляется в них само. */
export function listLogActions(): Promise<{ actions: string[] }> {
  return clientApiFetch<{ actions: string[] }>('/admin/logs/actions');
}
