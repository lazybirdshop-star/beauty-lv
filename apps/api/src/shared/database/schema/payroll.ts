import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizationMembers } from './organization-members';
import { organizations } from './organizations';
import { users } from './users';

export const compensationTypeEnum = pgEnum('compensation_type', [
  'percent',
  'chair_rent',
  'salary_plus_percent',
]);
export const rentPeriodEnum = pgEnum('rent_period', ['day', 'week', 'month']);
export const payoutStatusEnum = pgEnum('payout_status', ['draft', 'approved', 'paid']);

/**
 * Условия расчёта с мастером — SALON.md §7.2, миграция 0058.
 *
 * Строки **только добавляются**: новые условия действуют с `effective_from`, а
 * конец прежних выводится из следующей строки, а не хранится. Иначе поднятие
 * процента задним числом молча переписывало бы уже согласованную ведомость.
 * Форма строки (какие поля заполнены у какого вида) закреплена CHECK-ограничением
 * в миграции.
 */
export const staffCompensation = pgTable(
  'staff_compensation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    type: compensationTypeEnum('type').notNull(),
    /** Базисные пункты: 4500 = 45 %. */
    percentBps: integer('percent_bps'),
    /** Аренда кресла в центах за `rent_period`. */
    rentAmount: integer('rent_amount'),
    rentPeriod: rentPeriodEnum('rent_period'),
    /** Оклад в центах в месяц; в ведомость — пропорционально дням периода. */
    salaryAmount: integer('salary_amount'),
    currency: text('currency').notNull().default('EUR'),
    effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('staff_compensation_member_effective_idx').on(
      table.organizationMemberId,
      table.effectiveFrom,
    ),
    index('staff_compensation_organization_idx').on(table.organizationId),
  ],
);

export type StaffCompensationRow = typeof staffCompensation.$inferSelect;

/** Отрезок периода с одними условиями — снимок того, как посчитана ведомость. */
export interface PayoutSegmentSnapshot {
  from: string;
  to: string;
  days: number;
  compensationId: string | null;
  type: 'percent' | 'chair_rent' | 'salary_plus_percent' | null;
  percentBps: number | null;
  rentAmount: number | null;
  rentPeriod: 'day' | 'week' | 'month' | null;
  salaryAmount: number | null;
  revenue: number;
  bookings: number;
  master: number;
  salon: number;
}

/**
 * Ведомость — SALON.md §7.3.
 *
 * Суммы — снимки: утверждённая ведомость остаётся такой, какой её утвердили,
 * даже если завтра поменяются условия, цены или статус записи. Одна строка на
 * мастера и период; черновик пересчитывается, утверждённая и выплаченная — нет.
 */
export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    /** Включительно. */
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    currency: text('currency').notNull().default('EUR'),
    revenueAmount: integer('revenue_amount').notNull(),
    bookingsCount: integer('bookings_count').notNull(),
    /** К выплате мастеру; у аренды в убыточный период — меньше нуля. */
    masterAmount: integer('master_amount').notNull(),
    salonAmount: integer('salon_amount').notNull(),
    breakdown: jsonb('breakdown').$type<PayoutSegmentSnapshot[]>().notNull(),
    status: payoutStatusEnum('status').notNull().default('draft'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    paidByUserId: uuid('paid_by_user_id').references(() => users.id),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payouts_member_period_unique').on(
      table.organizationMemberId,
      table.periodStart,
      table.periodEnd,
    ),
    index('payouts_organization_period_idx').on(table.organizationId, table.periodStart),
  ],
);

export type PayoutRow = typeof payouts.$inferSelect;
