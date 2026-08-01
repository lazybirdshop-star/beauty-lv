import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

/**
 * The master's own address book — independent of `bookings.guestPhone`
 * for now (no FK between them yet). Visit history is derived by matching
 * phone numbers client-side rather than a hard link, so this ships without
 * a risky retrofit migration on `bookings` (see TASKS.md MD-5).
 */
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
