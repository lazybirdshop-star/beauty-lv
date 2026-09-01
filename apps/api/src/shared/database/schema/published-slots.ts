import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
    /**
     * Окно есть, но клиенту его не предлагают.
     *
     * Отдельным полем, а не третьим значением `status`: скрытость и занятость
     * — разные вопросы к одному окну («видно ли снаружи» и «продано ли»), и
     * сложением их в один перечень частичный индекс «одна активная запись на
     * окно» пришлось бы переписывать, а каждый `status = 'available'` в
     * репозитории — перечитывать заново.
     *
     * Время, а не флаг: мастер, вернувшись к скрытому окну через месяц, видит,
     * когда сама его убрала, и это дешевле любого журнала.
     */
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('published_slots_member_starts_at_unique').on(
      table.organizationMemberId,
      table.startsAt,
    ),
    /*
     * Отрезок времени **без** мастера: занятость публичной страницы и
     * ежечасное гашение заявок спрашивают «окна в таком-то промежутке» по всей
     * организации, а не по одному участнику. Уникальный индекс выше для этого
     * не годится — у него ведущая колонка другая, и по одной дате он не
     * читается.
     */
    index('published_slots_starts_at_idx').on(table.startsAt),
  ],
);

export type PublishedSlotRow = typeof publishedSlots.$inferSelect;
export type NewPublishedSlotRow = typeof publishedSlots.$inferInsert;
