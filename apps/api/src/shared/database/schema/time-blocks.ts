import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Заблокированное время мастера — спецификация дашборда §24, миграция 0055.
 *
 * Не «скрытое окно»: скрытое окно мастер открыла, но не предлагает клиентам, а
 * в блоке её нет вовсе — обед, учёба, отпуск. Под блоком свободные окна
 * снимаются, внутри него нельзя ни открыть окно, ни записать человека.
 *
 * Конкретный интервал, а не правило повторения (SALON.md §6.2): повтор заводит
 * столько строк, сколько недель.
 */
export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Граница арендатора — прямо в строке: командный календарь спрашивает по ней. */
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    /** «Обед», «Учёба» — то, что увидит администратор в колонке мастера. */
    title: text('title'),
    /** Кто поставил блок: мастер себе или администратор за неё. */
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('time_blocks_ends_after_starts', sql`${table.endsAt} > ${table.startsAt}`),
    index('time_blocks_member_starts_at_idx').on(table.organizationMemberId, table.startsAt),
    index('time_blocks_organization_starts_at_idx').on(table.organizationId, table.startsAt),
  ],
);

export type TimeBlockRow = typeof timeBlocks.$inferSelect;
export type NewTimeBlockRow = typeof timeBlocks.$inferInsert;
