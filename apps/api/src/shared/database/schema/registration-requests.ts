import { REGISTRATION_REQUEST_STATUSES } from '@amolie/shared-kernel';
import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

/** Значения — из `@amolie/shared-kernel`, чтобы enum базы и код не разъехались. */
export const registrationRequestStatusEnum = pgEnum(
  'registration_request_status',
  REGISTRATION_REQUEST_STATUSES,
);

/**
 * Заявка на регистрацию мастера — вход на платформу, пока она закрыта.
 *
 * Пришла на смену инвайт-кодам: код требовал, чтобы платформа первой нашла
 * мастера и что-то ей отправила, а заявка позволяет мастеру постучаться
 * самой. Открытая регистрация (`platform_settings.registration_mode = open`)
 * этот путь не отменяет — она лишь одобряет заявку тем же кодом сразу.
 *
 * **`password_hash` хранится только до решения.** Человек задаёт пароль один
 * раз, при подаче, и одобрение переносит хеш в аккаунт; в тот же момент он
 * здесь обнуляется. Отклонение обнуляет его тоже: хранить учётные данные
 * человека, которого не пустили, не за чем.
 */
export const registrationRequests = pgTable(
  'registration_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    /** Нормализован приложением до вставки — как и в `users`. */
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    locale: text('locale').notNull().default('ru'),
    passwordHash: text('password_hash'),
    /** Что мастер написала о себе: единственное, по чему заявку и разбирают. */
    message: text('message'),
    status: registrationRequestStatusEnum('status').notNull().default('pending'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
    /** Почему отказано — уходит в письмо заявителю. */
    rejectionReason: text('rejection_reason'),
    createdUserId: uuid('created_user_id').references(() => users.id),
    createdOrganizationId: uuid('created_organization_id').references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /*
     * Одна открытая заявка на адрес.
     *
     * Частичный индекс, а не полный: человек, которому отказали, имеет право
     * прийти снова — например, исправив то, из-за чего отказали. Запрет
     * относится только к очереди: три одинаковые заявки от одного человека
     * это не три решения, а одно, принятое трижды.
     */
    uniqueIndex('registration_requests_pending_email_unique')
      .on(table.email)
      .where(sql`status = 'pending'`),
  ],
);

export type RegistrationRequestRow = typeof registrationRequests.$inferSelect;
export type NewRegistrationRequestRow = typeof registrationRequests.$inferInsert;
