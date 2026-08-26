import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

/** Append-only (DATABASE.md §3.16) — written automatically on sensitive admin actions, never edited or deleted. */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  /**
   * Кто на самом деле сидел за столом, если это была поддержка.
   *
   * Токен имперсонации несёт `sub` мастера — и правильно, кабинет обязан
   * работать так, будто вошла она. Но журнал от этого начинал утверждать, что
   * блокировку клиента сделала сама мастер, и на её вопрос «это точно была
   * я?» отвечал «да, вы». Отдельная колонка, а не поле в `metadata`: «покажи
   * всё, что делала поддержка» — это запрос, который однажды зададут, и он
   * должен быть запросом по колонке, а не разбором json.
   */
  impersonatedByUserId: uuid('impersonated_by_user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
