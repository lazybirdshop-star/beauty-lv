import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bookings } from './bookings';
import { users } from './users';

/**
 * Зачем выдан токен. Одна таблица на все случаи, а не три почти одинаковых:
 * жизненный цикл у них общий — выдан, отправлен письмом, разово погашен или
 * протух, — и правило «использованный не годится» должно существовать в
 * одном месте.
 *
 * `client_sign_in` — вход клиента в его кабинет. У клиента нет пароля и не
 * должно быть: он заходит в год четыре раза, и пароль, который он заведёт,
 * будет либо забыт, либо повторён с чужого сайта. Письмо — единственный
 * ключ, поэтому оно и живёт здесь, рядом с остальными одноразовыми.
 */
export const userTokenPurposeEnum = pgEnum('user_token_purpose', [
  'email_verification',
  'password_reset',
  'client_sign_in',
]);

/**
 * Одноразовые ссылки, которые уходят человеку на почту.
 *
 * **Хранится хеш, а не токен.** Утечка этой таблицы не должна давать доступ к
 * аккаунтам: сам токен существует только в письме и в адресной строке. По той
 * же причине здесь SHA-256, а не argon2 — токен генерируется нами и несёт
 * 256 бит случайности, перебирать в нём нечего, а проверка обязана быть
 * дешёвой, чтобы не превратиться в вектор на CPU.
 */
export const userTokens = pgTable(
  'user_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    purpose: userTokenPurposeEnum('purpose').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    /**
     * Запись, со страницы которой начат вход — только у `client_sign_in`.
     *
     * Нужна потому, что email при записи необязателен: гость, который его не
     * оставил, вводит адрес на странице своей записи, и связать эту запись с
     * будущим аккаунтом больше нечем — по адресу она не найдётся, его в ней
     * нет. Контекст живёт здесь, а не в ссылке письма: всё, что попало в
     * адресную строку, человек может подменить, а строку в этой таблице —
     * нет.
     */
    bookingId: uuid('booking_id').references(() => bookings.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Проставляется в момент погашения: повторный переход по ссылке не сработает. */
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* Выдача нового токена гасит прежние того же назначения — запрос идёт
       ровно по этой паре. */
    index('user_tokens_user_purpose_idx').on(table.userId, table.purpose),
  ],
);

export type UserTokenRow = typeof userTokens.$inferSelect;
