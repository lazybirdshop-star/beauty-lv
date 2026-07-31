import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Base role. Fine-grained access inside an organization lives in
 * `organization_members.role` (see DATABASE.md §3.4).
 */
export const systemRoleEnum = pgEnum('system_role', ['client', 'master', 'platform_admin']);

/**
 * `email`/`phone` are stored lowercase/normalized by the application layer
 * before insert, so a plain unique constraint is sufficient here (see
 * DATABASE.md §3.1) — no citext extension dependency for MVP.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  phone: text('phone').unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  locale: text('locale').notNull().default('ru'),
  systemRole: systemRoleEnum('system_role').notNull().default('client'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  gdprConsentAt: timestamp('gdpr_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
