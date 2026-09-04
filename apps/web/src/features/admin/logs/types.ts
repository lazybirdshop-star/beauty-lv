export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
  actorUserId: string | null;
  actorName: string | null;
  /** Заполнено, только если за столом этого человека сидела поддержка. */
  impersonatedByUserId: string | null;
  impersonatedByName: string | null;
  /* Выводится из имени действия на сервере. Приходит не от всякого API: веб и
     API выкатываются раздельно. */
  severity?: 'info' | 'warning';
}

/** Отборы журнала — те же значения, что принимает API. */
export type LogSeverityFilter = 'all' | 'info' | 'warning';
export type LogActorFilter = 'all' | 'person' | 'support' | 'system';
export type LogDateFilter = 'today' | 'week' | 'all';

export interface AuditLogFilters extends Record<string, string | number | undefined> {
  action?: string;
  severity?: Exclude<LogSeverityFilter, 'all'>;
  actor?: Exclude<LogActorFilter, 'all'>;
  from?: string;
  to?: string;
}
