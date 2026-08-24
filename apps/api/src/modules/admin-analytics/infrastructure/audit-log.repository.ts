import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, count, desc, eq, gte, lt } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { auditLog } from '../../../shared/database/schema/audit-log';
import { users } from '../../../shared/database/schema/users';
import { searchCondition, type AdminListPage, type AdminListRange } from './admin-list-query';

export interface RecordAuditEntryInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery extends AdminListRange {
  query?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
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

  /**
   * Журнал с ситами и страницами.
   *
   * Раньше отдавались последние двести записей, а фильтрация шла в браузере —
   * то есть найти «кто заблокировал этого мастера в июне» было нельзя в
   * принципе: июнь в двести последних строк не попадал. Теперь и поиск, и
   * отрезок времени, и вид действия — часть запроса.
   */
  async list(query: AuditLogQuery): Promise<AdminListPage<AuditLogEntry>> {
    const conditions: (SQL | undefined)[] = [
      query.action ? eq(auditLog.action, query.action) : undefined,
      query.entityType ? eq(auditLog.entityType, query.entityType) : undefined,
      query.from ? gte(auditLog.createdAt, query.from) : undefined,
      /* Полуинтервал `[from, to)` — как везде в продукте: закрытый справа
         отрезок отдал бы полночь обоим смежным дням. */
      query.to ? lt(auditLog.createdAt, query.to) : undefined,
      searchCondition(query.query, [users.fullName, auditLog.action, auditLog.entityType]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [items, [totalRow]] = await Promise.all([
      this.selectEntries()
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(auditLog)
        .leftJoin(users, eq(users.id, auditLog.actorUserId))
        .where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  /**
   * Какие действия вообще встречаются в журнале.
   *
   * Список сит собирается из данных, а не из перечисления в коде: новое
   * действие появляется в продукте одной строкой `auditLog.record(...)`, и
   * заводить ради него вторую запись в списке фильтров — способ однажды
   * получить фильтр, который ничего не находит, и действие, которого нет в
   * фильтрах.
   */
  async listActions(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ action: auditLog.action })
      .from(auditLog)
      .orderBy(auditLog.action);
    return rows.map((row) => row.action);
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
