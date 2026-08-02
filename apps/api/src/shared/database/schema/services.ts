import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const servicePriceTypeEnum = pgEnum('service_price_type', ['fixed', 'from']);

/**
 * `category_id` (DATABASE.md §3.6) is deliberately deferred until
 * `service_categories` ships (TASKS.md S-3) — same precedent as
 * `organization_members.location_id` (see TASKS.md O-4): no FK to a table
 * that doesn't exist yet.
 */
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferAfterMinutes: integer('buffer_after_minutes').notNull().default(0),
  priceAmount: integer('price_amount').notNull(),
  priceCurrency: text('price_currency').notNull().default('EUR'),
  priceType: servicePriceTypeEnum('price_type').notNull().default('fixed'),
  color: text('color'),
  /**
   * Example-of-work photo shown on the public price list. A URL, not an
   * upload: the product has no object storage yet (ARCHITECTURE.md lists
   * R2/S3 as future work), and the master already pastes her avatar the
   * same way.
   */
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
