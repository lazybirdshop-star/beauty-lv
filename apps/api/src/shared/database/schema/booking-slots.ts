import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { bookings } from './bookings';
import { publishedSlots } from './published-slots';

/**
 * Every window a visit actually occupies.
 *
 * `published_slots` has no duration — a window is "a visit may start here"
 * (PRD.md §7.4). A booking therefore used to claim exactly one window, and a
 * long service left the windows it ran through still bookable: a 90-minute
 * appointment at 10:00 kept 10:30 and 11:00 open for somebody else. Masters
 * compensated by publishing windows spaced to their own services, which
 * stops working the moment a client assembles a chain out of short ones.
 *
 * `bookings.published_slot_id` stays as the window the visit *starts* at —
 * every read path joins it for `starts_at`, and the existing "one active
 * booking per starting window" index still holds. This table records the
 * full occupancy, the start window included.
 *
 * Rows are kept after cancellation and stamped with `released_at` instead of
 * being deleted, so the history of what a cancelled visit held survives. The
 * partial unique index is what makes double-booking impossible in the
 * database rather than only in application code: at most one *unreleased*
 * claim may exist per window.
 */
export const bookingSlots = pgTable(
  'booking_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    publishedSlotId: uuid('published_slot_id')
      .notNull()
      .references(() => publishedSlots.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set when the booking is cancelled and the window goes back on sale. */
    releasedAt: timestamp('released_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('booking_slots_active_published_slot_unique')
      .on(table.publishedSlotId)
      .where(sql`${table.releasedAt} is null`),
  ],
);

export type BookingSlotRow = typeof bookingSlots.$inferSelect;
export type NewBookingSlotRow = typeof bookingSlots.$inferInsert;
