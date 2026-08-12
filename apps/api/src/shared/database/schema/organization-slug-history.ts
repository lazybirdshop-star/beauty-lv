import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

/**
 * Every address an organization has ever answered to.
 *
 * A master's slug is printed on business cards, pasted into Instagram bios and
 * saved in her clients' browsers. Letting her rename it is right — the
 * auto-generated one from registration is a placeholder — but a rename that
 * turns all of that into a 404 is a silent loss she finds out about from the
 * client who stopped coming.
 *
 * So the old address stays here and keeps working: the public page resolves
 * through this table and answers with a permanent redirect to the current
 * slug. The row is also what stops a stranger from claiming an address a
 * master just released and inheriting her traffic — uniqueness is checked
 * against this table as well as against `organizations.slug`.
 */
export const organizationSlugHistory = pgTable(
  'organization_slug_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    /** The address that used to be live. Unique platform-wide, forever. */
    slug: text('slug').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('organization_slug_history_org_idx').on(table.organizationId)],
);

export type OrganizationSlugHistoryRow = typeof organizationSlugHistory.$inferSelect;
