import { ORG_ROLES, type FocalPoint } from '@amolie/shared-kernel';
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { users } from './users';

/** Values come from `@amolie/shared-kernel` — see packages/shared-kernel/src/rbac.ts. */
export const organizationMemberRoleEnum = pgEnum('organization_member_role', ORG_ROLES);
export const organizationMemberStatusEnum = pgEnum('organization_member_status', [
  'active',
  'invited',
  'disabled',
]);

/**
 * `location_id` is intentionally omitted for now — multi-location salons
 * land with the locations table (TASKS.md O-4). One member row per
 * (organization, user) pair.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: organizationMemberRoleEnum('role').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    /**
     * Лицо человека, а не украшение макета.
     *
     * Раньше портрет мастера жил в дизайне страницы
     * (`page_design.masterPhoto.media`) и дублировался в `organizations.logo_url`.
     * Для страницы одного человека разницы не было; для салона модель
     * распадается — восемь мастеров и один слот под фото, — а SALON.md §4.3 и
     * SL-6 требуют аватар у каждого участника: он подписывает окно в общем
     * календаре и открывает личную страницу `/m/{public_slug}`.
     *
     * Следствие, принятое осознанно: фото выходит из цикла «черновик →
     * опубликовать → откатить». Смена портрета применяется сразу, и откат
     * версии дизайна её не отменяет. Версия восстанавливает оформление, а лицо
     * сотрудника — не редакция оформления.
     *
     * Макету остаётся решение «показывать ли портрет» (`masterPhoto.shown` и
     * `STYLE_LIMITS.masterPhoto`): у плакатного мира портрета нет по замыслу.
     */
    avatarUrl: text('avatar_url'),
    /**
     * Кадрирование этого же снимка — `object-position` в процентах.
     *
     * Едет вместе с фотографией, а не с макетом: точка, по которой снимок
     * держит лицо в круге, есть свойство снимка. Ставится вместе с `avatar_url`
     * и вместе с ним же обнуляется; `null` читается как центр (`CENTER_FOCAL`).
     */
    avatarFocal: jsonb('avatar_focal').$type<FocalPoint>(),
    status: organizationMemberStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('organization_members_org_user_unique').on(table.organizationId, table.userId),
  ],
);

export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;
export type NewOrganizationMemberRow = typeof organizationMembers.$inferInsert;
