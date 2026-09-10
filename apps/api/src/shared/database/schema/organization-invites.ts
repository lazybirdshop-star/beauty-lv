import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { organizationMemberRoleEnum, organizationMembers } from './organization-members';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Приглашение сотрудника в салон (SALON.md SL-3).
 *
 * Своя таблица, а не строка в `user_tokens`, хотя жизненный цикл у ссылок
 * общий. Причина в том, кому ссылка адресована: у `user_tokens` есть
 * `user_id NOT NULL` — она всегда про существующий аккаунт, — а сотрудницу
 * приглашают по адресу почты, которого в продукте может не быть вовсе.
 * Заводить ей аккаунт заранее нельзя: половина приглашений не принимается
 * никогда, и база покрылась бы призраками, которые нельзя ни отличить от
 * живых людей, ни удалить.
 *
 * Второе: приглашение несёт роль и организацию. Положить их в общую таблицу
 * одноразовых ссылок значит добавить ей две колонки, пустые у трёх остальных
 * назначений, — а `user_tokens` ровно потому и одна, что у её строк общая
 * форма.
 *
 * Хранится хеш, не токен, — по той же причине, что и там: утечка таблицы не
 * должна давать доступ к салону.
 */
export const organizationInvites = pgTable(
  'organization_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    /** Приведён к канону (`trim().toLowerCase()`) вызывающим. */
    email: text('email').notNull(),
    /**
     * Роль, с которой человек войдёт. `owner` сюда не попадает: владелец у
     * организации один, и передача владения — не приглашение, а отдельный
     * разговор с последствиями для подписки и юридического лица.
     */
    role: organizationMemberRoleEnum('role').notNull(),
    /** Как назвать человека в списке до того, как он войдёт и назовётся сам. */
    displayName: text('display_name'),
    tokenHash: text('token_hash').notNull().unique(),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    /** Строка членства, которой приглашение обернулось, — для истории. */
    acceptedMemberId: uuid('accepted_member_id').references(() => organizationMembers.id),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /*
     * Одно живое приглашение на адрес в организации.
     *
     * Частичный индекс, а не полный: отозванные и принятые остаются лежать
     * историей, и второй раз пригласить того же человека — законное действие.
     * Без этого условия повторное приглашение упиралось бы в конфликт с
     * приглашением, которое сама же владелица отозвала месяц назад.
     */
    uniqueIndex('organization_invites_pending_unique')
      .on(table.organizationId, table.email)
      .where(sql`accepted_at is null and revoked_at is null`),
  ],
);

export type OrganizationInviteRow = typeof organizationInvites.$inferSelect;
export type NewOrganizationInviteRow = typeof organizationInvites.$inferInsert;
