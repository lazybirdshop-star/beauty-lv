import { Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { auditLog, type AuditLogRow } from '../../../shared/database/schema/audit-log';

export interface RecordAuditEntryInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    await this.db.insert(auditLog).values(input);
  }

  list(limit = 100): Promise<AuditLogRow[]> {
    return this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  }
}
