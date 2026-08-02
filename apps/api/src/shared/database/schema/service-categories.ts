import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

/**
 * DATABASE.md §3.5, finally shipped (TASKS.md S-3) — `services.category_id`
 * has been waiting on this table since the catalog module.
 *
 * One level deep on purpose: "Стрижка → Fader cut", "Ногти → Маникюр". A
 * tree would need recursive queries and a drag-and-drop editor to be worth
 * anything, and no beauty catalogue this product has seen needs one.
 *
 * `is_active` is beyond the original spec: a master who runs a seasonal
 * category wants to hide it without deleting it and losing the services'
 * grouping. Hiding a category hides it from the public page only — the
 * services inside stay individually active and keep their own `is_active`.
 */
export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  /** Master-defined order; ties broken by `created_at` so the list is stable. */
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ServiceCategoryRow = typeof serviceCategories.$inferSelect;
export type NewServiceCategoryRow = typeof serviceCategories.$inferInsert;
