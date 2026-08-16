import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

/**
 * Подписки браузера на push — по одной строке на устройство.
 *
 * Привязка к пользователю, а не к организации: подписку выдаёт браузер
 * конкретного устройства тому, кто в нём вошёл, и мастер, ведущая два салона,
 * должна получать уведомления обоих на один и тот же телефон. Какие записи ей
 * причитаются, решает членство в организации в момент отправки, а не эта
 * таблица.
 *
 * `endpoint` уникален глобально: это адрес, выданный push-сервисом
 * (FCM, Mozilla, Apple) именно этой установке браузера, и он же —
 * естественный ключ. Повторная подписка того же устройства обязана обновлять
 * строку, а не плодить копии, иначе одно уведомление придёт мастеру трижды.
 *
 * `p256dh` и `auth` — открытый ключ устройства и секрет аутентификации из
 * `PushSubscription.getKey()`. Без них тело уведомления невозможно
 * зашифровать: по RFC 8291 payload шифруется на стороне сервера ключами
 * подписчика, и push-сервис передаёт его, не умея прочитать.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    /**
     * Чтобы мастер узнала своё устройство в списке и отключила лишнее.
     * Хранится как прислал браузер — разбор строки на «iPhone» и «Chrome»
     * это задача показа, а не хранения.
     */
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Обновляется при каждом переподписывании кабинета. Подписки протухают
     * молча — устройство потеряно, браузер переустановлен, разрешение
     * отозвано, — и мёртвые строки чистятся по ответу push-сервиса (404/410),
     * но только для тех, кому мы пытались писать. Эта отметка даёт увидеть
     * остальные.
     */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* Единственный горячий запрос: «все устройства этого мастера» перед
       отправкой. */
    index('push_subscriptions_user_id_idx').on(table.userId),
  ],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
