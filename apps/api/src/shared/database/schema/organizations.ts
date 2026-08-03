import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  /**
   * Appearance of the public page. Keys are validated against
   * `THEME_PRESETS`/`FONT_PRESETS` in shared-kernel rather than a DB enum:
   * adding a palette should be one entry in code, not a migration.
   * Defaults reproduce today's look exactly, so existing masters see no change.
   */
  /**
   * Defaults follow the 2026-08 redesign. The constant in shared-kernel is
   * only a fallback for a null the column cannot hold, so the default lives
   * here too — changing the constant alone left every existing master on the
   * old world.
   */
  /** Which surface language the master's public page uses — see DESIGN_PRESETS. */
  designPresetKey: text('design_preset_key').notNull().default('poster'),
  themePresetKey: text('theme_preset_key').notNull().default('riga-poster'),
  fontPresetKey: text('font_preset_key').notNull().default('onest-unbounded'),
  /** Manual colour overrides — only the tokens the master is offered (cards/text/buttons/background). */
  themeOverrides: jsonb('theme_overrides').$type<Record<string, string>>(),
  /** `gradient` keeps the ambient hero; `image` uses `coverUrl` as a banner. */
  heroStyle: text('hero_style').notNull().default('gradient'),
  /** Optional page-wide background photo, shown under a scrim so text stays readable. */
  backgroundImageUrl: text('background_image_url'),
  status: organizationStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
