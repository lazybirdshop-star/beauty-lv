import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';
import { organizations } from './organizations';
import { publishedSlots } from './published-slots';
import { services } from './services';
import { users } from './users';

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
  /**
   * Мастер так и не ответила, а час визита прошёл.
   *
   * Отдельное значение, а не «отменена мастером»: она ничего не отменяла, и
   * писать в историю клиента чужое решение нельзя. Заводится только фоновой
   * задачей — руками этот статус не ставят.
   */
  'expired',
]);

export const bookingSourceEnum = pgEnum('booking_source', [
  'public_page',
  'admin_manual',
  'marketplace',
]);

/**
 * `location_id` (DATABASE.md §3.9) is deliberately deferred until the
 * locations table ships (TASKS.md O-4) — same precedent as
 * `services.category_id` / `organization_members.location_id`.
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    publishedSlotId: uuid('published_slot_id')
      .notNull()
      .references(() => publishedSlots.id),
    clientUserId: uuid('client_user_id').references(() => users.id),
    guestName: text('guest_name'),
    guestPhone: text('guest_phone'),
    guestEmail: text('guest_email'),
    guestInstagram: text('guest_instagram'),
    /**
     * The only key a guest has to their own booking.
     *
     * There are no client accounts, so nothing else identifies the person who
     * booked once they close the page — and without that they cannot be told
     * whether the master accepted, nor be given a calendar file that is theirs
     * and not someone else's. Random and unique, so knowing one says nothing
     * about any other.
     */
    publicToken: uuid('public_token').notNull().defaultRandom(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    cancellationReason: text('cancellation_reason'),
    source: bookingSourceEnum('source').notNull(),
    idempotencyKey: text('idempotency_key').unique(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // Uniqueness only among *active* bookings (DATABASE.md §3.9: "не может
    // ссылаться больше одной активной записи") — a cancelled booking must
    // free its slot for someone else to book for real, not just in
    // published_slots.status.
    uniqueIndex('bookings_active_published_slot_id_unique')
      .on(table.publishedSlotId)
      .where(sql`${table.status} NOT IN ('cancelled_by_client', 'cancelled_by_master')`),
    uniqueIndex('bookings_public_token_unique').on(table.publicToken),
    /*
     * С организации начинается почти каждый запрос к этой таблице: список
     * записей (он же бейдж непринятых на каждом экране кабинета), пять
     * агрегатов «Финансов», занятость публичной страницы. Без индекса все они
     * читали таблицу целиком — по всем арендаторам сразу, то есть цена
     * открытия своего кабинета росла от роста чужих салонов.
     *
     * Статус вторым: он приходит как независимое сито (`status`-фильтр в
     * `listForOrganization`, `REVENUE_STATUS` в финансах) и в префиксе индекса
     * бесплатен для тех запросов, которые его не спрашивают. Время визита в
     * индекс не идёт — оно живёт в `published_slots`.
     */
    index('bookings_organization_id_status_idx').on(table.organizationId, table.status),
    // Кабинет клиента спрашивает «все мои визиты», не называя организации:
    // это единственный запрос к таблице, который не начинается с
    // `organization_id`, и без своего индекса он читает её целиком.
    index('bookings_client_user_id_idx').on(table.clientUserId),
  ],
);

/** Snapshotted at booking time — `services` can change later without rewriting history. */
export const bookingItems = pgTable(
  'booking_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    serviceNameSnapshot: text('service_name_snapshot').notNull(),
    durationMinutesSnapshot: integer('duration_minutes_snapshot').notNull(),
    priceAmountSnapshot: integer('price_amount_snapshot').notNull(),
    priceCurrencySnapshot: text('price_currency_snapshot').notNull(),
  },
  (table) => [
    /*
     * Внешний ключ индекса в Postgres не создаёт, а по этой колонке ходит
     * каждое письмо воркера (`booking-letter`), каждый показ записи, история
     * клиента и занятость публичной страницы. Без него отправка одного письма
     * стоила полного прохода по всем позициям платформы.
     */
    index('booking_items_booking_id_idx').on(table.bookingId),
  ],
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
export type BookingItemRow = typeof bookingItems.$inferSelect;
export type NewBookingItemRow = typeof bookingItems.$inferInsert;
