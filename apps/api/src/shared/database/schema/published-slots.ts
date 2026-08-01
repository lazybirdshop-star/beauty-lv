import { pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';

export const publishedSlotStatusEnum = pgEnum('published_slot_status', ['available', 'booked']);

/**
 * No working hours, no schedule, no generation algorithm (PRD.md §7.4).
 * The master publishes exactly the moments she's free, one at a time — see
 * DATABASE.md §3.8. Duration is decided at booking time by whichever
 * service the client picks, not stored here.
 */
export const publishedSlots = pgTable(
  'published_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    status: publishedSlotStatusEnum('status').notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('published_slots_member_starts_at_unique').on(
      table.organizationMemberId,
      table.startsAt,
    ),
  ],
);

export type PublishedSlotRow = typeof publishedSlots.$inferSelect;
export type NewPublishedSlotRow = typeof publishedSlots.$inferInsert;
