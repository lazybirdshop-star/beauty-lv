import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const organizationTypeEnum = pgEnum('organization_type', ['solo', 'salon']);
export const organizationStatusEnum = pgEnum('organization_status', [
  'active',
  'suspended',
  'archived',
]);

/**
 * `slug` is the organization's subdomain username: `{slug}.beauty.lv`
 * (see ARCHITECTURE.md §3, DATABASE.md §3.2). Normalized to lowercase by
 * the application layer before insert.
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: organizationTypeEnum('type').notNull().default('solo'),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  defaultLocale: text('default_locale').notNull().default('ru'),
  timezone: text('timezone').notNull().default('Europe/Riga'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  addressLine: text('address_line'),
  city: text('city'),
  instagramHandle: text('instagram_handle'),
  showPricesSection: boolean('show_prices_section').notNull().default(true),
  showContactsSection: boolean('show_contacts_section').notNull().default(true),
  /** false = every new booking starts `pending` and the master confirms by hand (today's default behavior). */
  autoConfirmBookings: boolean('auto_confirm_bookings').notNull().default(false),
  status: organizationStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
