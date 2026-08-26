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
}
