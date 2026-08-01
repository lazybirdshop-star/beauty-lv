import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

/**
 * The master's address book — auto-populated from bookings (both her own
 * manual entries and public guest bookings) and de-duplicated by phone,
 * `phone` is always stored normalized (`normalizePhone()` in shared-kernel:
 * whitespace stripped) so "+371 26 123 456" and "+37126123456" collide as
 * the same client instead of creating two rows. Still no hard FK to
 * `bookings` — the join is by phone, done in application code, not SQL.
 */
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    instagramHandle: text('instagram_handle'),
    notes: text('notes'),
    /** Blocks self-service booking on the public page — checked by phone or Instagram, whichever matches. Never blocks a master-entered booking. */
    isBlocked: boolean('is_blocked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('clients_organization_id_phone_unique').on(table.organizationId, table.phone),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
