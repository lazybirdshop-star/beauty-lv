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
    /**
     * Окно, которому принадлежит этот момент.
     *
     * «Окно» и «момент, с которого клиент может начать» — разные вещи, и до
     * миграции 0062 они были одним. Мастер, открывшая время с десяти до
     * двенадцати, заводила четыре строки и видела четыре предмета; «два часа»
     * нигде не были записаны как два часа.
     *
     * Моменты при этом остаются: у окна с одним началом клиент мог бы занять
     * только его, и полтора часа из двух пропали бы. Общий ключ даёт окну
     * жизнь целого — одна строка в календаре, одно действие снять, скрыть или
     * перенести, — не трогая ни защиту от двойной записи, ни запись гостя.
     *
     * Умолчание — свой ключ на строку: окно, заведённое по одному, остаётся
     * само собой.
     */
    windowId: uuid('window_id').notNull().defaultRandom(),
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
    /* Действия над окном идут по этому ключу: снять, скрыть, перенести
       целиком (миграция 0062). */
    index('published_slots_window_id_idx').on(table.windowId),
  ],
);

export type PublishedSlotRow = typeof publishedSlots.$inferSelect;
export type NewPublishedSlotRow = typeof publishedSlots.$inferInsert;
