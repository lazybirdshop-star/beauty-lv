import type { PageDesign } from '@amolie/shared-kernel';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const organizationTypeEnum = pgEnum('organization_type', ['solo', 'salon']);
export const organizationStatusEnum = pgEnum('organization_status', [
  'active',
  'suspended',
  'archived',
]);

/**
 * `slug` is the organization's subdomain username: `{slug}.amolie.com`
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
   * За сколько часов до визита клиент ещё может отменить его сам.
   *
   * `null` — не может вовсе, и это умолчание: до сих пор отменял только
   * мастер, и включать чужой календарь на самообслуживание без её ведома
   * нельзя. Ноль — можно до самого начала.
   *
   * Часы, а не «можно/нельзя»: мастеру важно не то, отменит ли клиент, а
   * успеет ли она продать освободившееся время. Час до визита и сутки до
   * визита — разные события, и разделяет их одно число.
   */
  clientCancellationHours: integer('client_cancellation_hours'),
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
  /** Whether the master's photo is shown in the hero at all. */
  /**
   * What the public page calls the master. Deliberately separate from
   * `name`, which came from registration: the name on the door is a
   * presentation choice, not an account fact, and editing one must not
   * rewrite the other.
   */
  publicDisplayName: text('public_display_name'),
  showAvatar: boolean('show_avatar').notNull().default(true),
  /*
   * Defaults follow the brand-styles collection: a new master starts on Soft
   * Studio — the safest premium fit for the core segment. Existing rows keep
   * whatever the master chose; the column default decides new organisations
   * only, and every key continues to resolve forever.
   */
  /* Умолчания идут за каталогом: он предлагает только доведённые миры, и
     новый мастер обязан завестись на том, что видит выбранным (`soft` и его
     авторская пара). Вернутся вместе с коллекцией. */
  designPresetKey: text('design_preset_key').notNull().default('soft'),
  /**
   * Заказной мир, выданный этой организации персонально.
   *
   * Каталог (`OFFERED_DESIGN_KEYS`) открыт всем, и на нём проверка не нужна.
   * Мир, нарисованный под конкретную студию, — работа, за которую заплатили,
   * и скрытие его из галереи это UI, а не право доступа: без этой колонки
   * ключ ставил бы себе любой, кто его угадает. `null` — не выдавали ничего.
   *
   * Текст, а не enum, по той же причине, что и `design_preset_key`: заказной
   * мир добавляется одним модулем в коде, миграция для него — лишний обряд.
   */
  customDesignKey: text('custom_design_key'),
  themePresetKey: text('theme_preset_key').notNull().default('blush-rose'),
  fontPresetKey: text('font_preset_key').notNull().default('onest'),
  /** Manual colour overrides — only the tokens the master is offered (cards/text/buttons/background). */
  themeOverrides: jsonb('theme_overrides').$type<Record<string, string>>(),
  /** `gradient` keeps the ambient hero; `image` uses `coverUrl` as a banner. */
  heroStyle: text('hero_style').notNull().default('gradient'),
  /** Optional page-wide background photo, shown under a scrim so text stays readable. */
  backgroundImageUrl: text('background_image_url'),
  /*
   * The Studio's two states (DESIGN_STUDIO.md §7.1). Both hold decisions by
   * the ten handles — `PageDesign` in shared-kernel — never resolved token
   * values: a style refined upstream must reach every page using it without
   * a migration, and stale HEX must not accumulate in the data.
   *
   * `pageDesign` is what visitors see. `null` means this page has never been
   * published from the Studio, and the legacy appearance columns above stay
   * the source of truth for it (§7.5): migration is an invitation, not a
   * move, and no published page changes by itself.
   *
   * `pageDesignDraft` is what the master sees on the canvas. `null` means
   * the draft equals what is published — the absence of a draft is a state,
   * not a missing row.
   */
  pageDesign: jsonb('page_design').$type<PageDesign>(),
  pageDesignDraft: jsonb('page_design_draft').$type<PageDesign>(),
  /**
   * When the master picked this address herself.
   *
   * `null` means the slug is still the one registration derived from her name
   * — a placeholder, not a decision. Onboarding asks about it precisely
   * because of this flag, and stops asking once it is set.
   */
  slugChosenAt: timestamp('slug_chosen_at', { withTimezone: true }),
  /**
   * When the master finished (or dismissed) the guided setup.
   *
   * Only the *end* of onboarding is stored. Every individual step is answered
   * by real data — a service exists, a window is published, the page is
   * designed — because a stored "step 3 done" flag drifts from reality the
   * moment she deletes the service she created in it.
   */
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  status: organizationStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
