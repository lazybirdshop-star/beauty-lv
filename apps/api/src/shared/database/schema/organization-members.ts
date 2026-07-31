import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

export const organizationMemberRoleEnum = pgEnum('organization_member_role', [
  'owner',
  'admin',
  'master',
]);
export const organizationMemberStatusEnum = pgEnum('organization_member_status', [
  'active',
  'invited',
  'disabled',
]);

/**
 * `location_id` is intentionally omitted for now — multi-location salons
 * land with the locations table (TASKS.md O-4). One member row per
 * (organization, user) pair.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: organizationMemberRoleEnum('role').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    status: organizationMemberStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('organization_members_org_user_unique').on(table.organizationId, table.userId),
  ],
);

export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;
export type NewOrganizationMemberRow = typeof organizationMembers.$inferInsert;
