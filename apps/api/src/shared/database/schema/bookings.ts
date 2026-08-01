import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';
import { organizations } from './organizations';
import { publishedSlots } from './published-slots';
import { services } from './services';
import { users } from './users';

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
]);

export const bookingSourceEnum = pgEnum('booking_source', [
  'public_page',
  'admin_manual',
  'marketplace',
]);

/**
 * `location_id` (DATABASE.md §3.9) is deliberately deferred until the
 * locations table ships (TASKS.md O-4) — same precedent as
 * `services.category_id` / `organization_members.location_id`.
 */
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  organizationMemberId: uuid('organization_member_id')
    .notNull()
    .references(() => organizationMembers.id),
  publishedSlotId: uuid('published_slot_id')
    .notNull()
    .unique()
    .references(() => publishedSlots.id),
  clientUserId: uuid('client_user_id').references(() => users.id),
  guestName: text('guest_name'),
  guestPhone: text('guest_phone'),
  guestEmail: text('guest_email'),
  status: bookingStatusEnum('status').notNull().default('pending'),
  cancellationReason: text('cancellation_reason'),
  source: bookingSourceEnum('source').notNull(),
  idempotencyKey: text('idempotency_key').unique(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/** Snapshotted at booking time — `services` can change later without rewriting history. */
export const bookingItems = pgTable('booking_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id),
  serviceNameSnapshot: text('service_name_snapshot').notNull(),
  durationMinutesSnapshot: integer('duration_minutes_snapshot').notNull(),
  priceAmountSnapshot: integer('price_amount_snapshot').notNull(),
  priceCurrencySnapshot: text('price_currency_snapshot').notNull(),
});

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
export type BookingItemRow = typeof bookingItems.$inferSelect;
export type NewBookingItemRow = typeof bookingItems.$inferInsert;
