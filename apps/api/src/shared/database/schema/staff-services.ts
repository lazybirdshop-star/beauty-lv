import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';
import { services } from './services';

/**
 * Кто из мастеров оказывает эту услугу — и на своих ли условиях
 * ([SALON.md](SALON.md) §4.4, §4.5, SL-5).
 *
 * До этой таблицы связи между человеком и услугой не было вовсе: гость мог
 * выбрать окно барбера и услугу «наращивание ресниц», и продукт эту запись
 * принимал. Для организации из одного человека вопрос не стоял — она делает
 * всё, что у неё в прайсе; со вторым мастером прайс перестаёт описывать
 * каждого.
 *
 * `organization_id` здесь нет намеренно: обе ссылки уже несут организацию, и
 * третья колонка с тем же значением — это третье место, где оно однажды
 * разойдётся. Что пара принадлежит одной организации, проверяет тот, кто
 * пишет.
 */
export const staffServices = pgTable(
  'staff_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    /**
     * Своя цена мастера, в минорных единицах. `null` — цена из прайса.
     *
     * Переопределение, а не копия: без `null` каждое изменение цены услуги
     * пришлось бы разносить по всем мастерам, и забытая строка тихо продавала
     * бы работу по прошлогодней цене. Валюта не переопределяется — она у
     * организации одна.
     */
    priceOverrideAmount: integer('price_override_amount'),
    /**
     * Своя длительность, в минутах. `null` — длительность из прайса.
     *
     * Влияет не только на счёт: от длительности зависит, какие окна вообще
     * подходят под визит, — то есть у двух мастеров на одну услугу разный
     * набор свободного времени.
     */
    durationOverrideMinutes: integer('duration_override_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('staff_services_member_service_unique').on(
      table.organizationMemberId,
      table.serviceId,
    ),
  ],
);

export type StaffServiceRow = typeof staffServices.$inferSelect;
export type NewStaffServiceRow = typeof staffServices.$inferInsert;
