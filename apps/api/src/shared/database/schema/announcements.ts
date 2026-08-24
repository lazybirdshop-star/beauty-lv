import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

/**
 * Объявление платформы мастерам.
 *
 * Единственный канал, которым продукт может сказать что-то всем сразу:
 * «завтра с 9 до 11 обновление», «появился экспорт клиентов», «просим
 * проверить свои цены». До этого такого канала не было вовсе — оставалось
 * писать каждой в мессенджер.
 *
 * Живёт отрезком времени, а не флагом «опубликовано»: объявление про
 * завтрашнее обновление обязано исчезнуть послезавтра само. Флаг требует,
 * чтобы кто-то не забыл его снять, и в продукте, где этим занимается один
 * человек, он не снимается никогда.
 */
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  /** Начало показа. По умолчанию — сейчас: объявление пишут, когда оно нужно. */
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  /** `null` — показывать, пока не снимут руками. */
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type AnnouncementRow = typeof announcements.$inferSelect;
export type NewAnnouncementRow = typeof announcements.$inferInsert;

/**
 * Кто уже прочитал объявление.
 *
 * На сервере, а не в браузере: мастер работает с телефона и с ноутбука, и
 * объявление, закрытое на одном, не должно возвращаться на другом. Строка
 * появляется один раз и никогда не меняется — поэтому составной ключ вместо
 * суррогатного id.
 */
export const announcementDismissals = pgTable(
  'announcement_dismissals',
  {
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.announcementId, table.userId] })],
);

export type AnnouncementDismissalRow = typeof announcementDismissals.$inferSelect;
