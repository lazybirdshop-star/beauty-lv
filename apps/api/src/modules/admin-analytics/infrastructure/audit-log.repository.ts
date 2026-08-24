import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { auditLog } from '../../../shared/database/schema/audit-log';
import { users } from '../../../shared/database/schema/users';

export interface RecordAuditEntryInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
  actorUserId: string | null;
  actorName: string | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    await this.db.insert(auditLog).values(input);
  }

  list(limit = 200): Promise<AuditLogEntry[]> {
    return this.selectEntries().orderBy(desc(auditLog.createdAt)).limit(limit);
  }

  /**
   * Что делали именно с этой сущностью.
   *
   * Общий журнал отвечает на «что происходило на платформе», карточка — на
   * «что происходило с этим человеком», и во втором случае листать первый
   * бесполезно: двести последних записей могут не содержать ни одной про него.
   */
  listForEntity(entityId: string, limit = 20): Promise<AuditLogEntry[]> {
    return this.selectEntries()
      .where(eq(auditLog.entityId, entityId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  private selectEntries() {
    return this.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        actorUserId: auditLog.actorUserId,
        actorName: users.fullName,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorUserId));
  }
}
