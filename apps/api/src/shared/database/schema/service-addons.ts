import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { services } from './services';

/**
 * "Стрижка машинкой — подстричь заодно бороду?": which services the master
 * wants offered on top of another one.
 *
 * Directed, not symmetric. Offering a beard trim after a haircut is a sound
 * suggestion; offering a haircut after a beard trim is a different decision,
 * and the master makes each one herself.
 *
 * Deliberately one hop deep. Suggestions are not chased recursively — an
 * add-on that pulls in its own add-ons turns a two-tap booking into a maze,
 * and nothing in the master's mental model says "the beard trim has add-ons
 * of its own".
 */
export const serviceAddons = pgTable(
  'service_addons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The service being booked. */
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    /** The service suggested alongside it. */
    addonServiceId: uuid('addon_service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('service_addons_pair_unique').on(table.serviceId, table.addonServiceId),
    // A service suggesting itself would render as "add this again" and, once
    // accepted, silently double the visit's length.
    check('service_addons_not_self', sql`${table.serviceId} <> ${table.addonServiceId}`),
  ],
);

export type ServiceAddonRow = typeof serviceAddons.$inferSelect;
export type NewServiceAddonRow = typeof serviceAddons.$inferInsert;
