import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

export const inviteCodeStatusEnum = pgEnum('invite_code_status', [
  'active',
  'used',
  'revoked',
  'expired',
]);

/**
 * Closed-registration gate for MVP masters (see ARCHITECTURE.md §10.1).
 * Redemption creates a user + organization + membership in one
 * transaction and marks the code `used`.
 */
export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  issuedByUserId: uuid('issued_by_user_id')
    .notNull()
    .references(() => users.id),
  intendedForName: text('intended_for_name'),
  intendedForContact: text('intended_for_contact'),
  status: inviteCodeStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  usedByUserId: uuid('used_by_user_id').references(() => users.id),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdOrganizationId: uuid('created_organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type InviteCodeRow = typeof inviteCodes.$inferSelect;
export type NewInviteCodeRow = typeof inviteCodes.$inferInsert;
