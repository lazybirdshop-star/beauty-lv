import type { PageDesign } from '@amolie/shared-kernel';
import { index, integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

/**
 * История публикаций страницы мастера (DESIGN_STUDIO.md §7.3).
 *
 * **История продолжается, а не переписывается.** Откат — это новая публикация
 * старого слепка, поэтому строки только добавляются: ни одна запись здесь не
 * меняется и не удаляется задним числом. Тот же принцип, по которому ведётся
 * CHANGELOG.
 *
 * Хранится решение целиком, а не диф. Диф пришлось бы уметь применять
 * обратно на данных любой давности, а слепок откатывается одним присвоением
 * и переживает любые изменения языка ручек: разбор недоверенного входа
 * (`sanitizePageDesign`) всё равно стоит на входе публикации.
 */
export const pageDesignVersions = pgTable(
  'page_design_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Порядковый номер публикации внутри организации — 1, 2, 3… */
    version: integer('version').notNull(),
    design: jsonb('design').$type<PageDesign>().notNull(),
    /** Кто нажал «Опубликовать»; `null` — если пользователь потом удалён. */
    publishedByUserId: uuid('published_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** Номер версии, копией которой является эта публикация, если это откат. */
    revertedFromVersion: integer('reverted_from_version'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* Единственный запрос к таблице — «последние десять этой организации»;
       индекс описывает ровно его. */
    index('page_design_versions_org_published_idx').on(table.organizationId, table.publishedAt),
  ],
);

export type PageDesignVersionRow = typeof pageDesignVersions.$inferSelect;
export type NewPageDesignVersionRow = typeof pageDesignVersions.$inferInsert;
