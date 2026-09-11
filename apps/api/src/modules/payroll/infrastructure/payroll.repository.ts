import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNull, lt, lte, ne, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import {
  payouts,
  staffCompensation,
  type PayoutRow,
  type PayoutSegmentSnapshot,
} from '../../../shared/database/schema/payroll';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { users } from '../../../shared/database/schema/users';
import type {
  CompensationTerms,
  DayRevenue,
  PayoutCalculation,
} from '../domain/payout-calculation';

export interface CompensationView extends CompensationTerms {
  organizationMemberId: string;
  memberName: string;
  currency: string;
}

export interface PayoutView {
  id: string;
  organizationMemberId: string;
  memberName: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  revenueAmount: number;
  bookingsCount: number;
  masterAmount: number;
  salonAmount: number;
  breakdown: PayoutSegmentSnapshot[];
  status: PayoutRow['status'];
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

const DAY_MS = 24 * 60 * 60_000;

/** Имя в салоне, а не в паспорте аккаунта. */
const memberName = sql<string>`coalesce(nullif(trim(${organizationMembers.displayName}), ''), ${users.fullName})`;

@Injectable()
export class PayrollRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listCompensation(organizationId: string, onlyMemberId?: string): Promise<CompensationView[]> {
    return this.db
      .select({
        id: staffCompensation.id,
        organizationMemberId: staffCompensation.organizationMemberId,
        memberName,
        type: staffCompensation.type,
        percentBps: staffCompensation.percentBps,
        rentAmount: staffCompensation.rentAmount,
        rentPeriod: staffCompensation.rentPeriod,
        salaryAmount: staffCompensation.salaryAmount,
        currency: staffCompensation.currency,
        effectiveFrom: staffCompensation.effectiveFrom,
        createdAt: staffCompensation.createdAt,
      })
      .from(staffCompensation)
      .innerJoin(
        organizationMembers,
        eq(staffCompensation.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(staffCompensation.organizationId, organizationId),
          onlyMemberId ? eq(staffCompensation.organizationMemberId, onlyMemberId) : undefined,
        ),
      )
      .orderBy(
        asc(staffCompensation.organizationMemberId),
        desc(staffCompensation.effectiveFrom),
        desc(staffCompensation.createdAt),
      );
  }

  async addCompensation(values: {
    organizationId: string;
    organizationMemberId: string;
    type: CompensationTerms['type'];
    percentBps: number | null;
    rentAmount: number | null;
    rentPeriod: CompensationTerms['rentPeriod'];
    salaryAmount: number | null;
    currency: string;
    effectiveFrom: string;
    createdByUserId: string;
  }): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(staffCompensation)
      .values(values)
      .returning({ id: staffCompensation.id });
    return row!;
  }

  async isMember(organizationId: string, memberId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      );
    return Boolean(row);
  }

  async timeZoneOf(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: organizations.timezone })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return row?.timezone ?? 'Europe/Riga';
  }

  /** Участники, для которых ведомость вообще может быть: не удалённые. */
  async memberIds(organizationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .orderBy(asc(organizationMembers.createdAt));
    return rows.map((row) => row.id);
  }

  /**
   * Доход по мастеру и гражданскому дню — одним запросом на весь салон.
   *
   * День — дата визита в поясе заведения: визит в 01:30 по Риге первого числа
   * принадлежит новому месяцу, даже если в UTC это ещё предыдущий. Грубые
   * границы по моменту сужают выборку индексом, точные гражданские — отбор
   * после группировки. Группировка по номерам столбцов: пояс уезжает в запрос
   * параметром, и повтор выражения в `GROUP BY` планировщик счёл бы другим.
   */
  async revenueByMemberDay(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    timeZone: string,
  ): Promise<Map<string, Map<string, DayRevenue>>> {
    const civilDay = sql<string>`to_char((${publishedSlots.startsAt} at time zone ${timeZone})::date, 'YYYY-MM-DD')`;
    const roughFrom = new Date(Date.parse(`${periodStart}T00:00:00.000Z`) - DAY_MS);
    const roughTo = new Date(Date.parse(`${periodEnd}T00:00:00.000Z`) + 2 * DAY_MS);

    const rows = await this.db
      .select({
        memberId: bookings.organizationMemberId,
        day: civilDay,
        amount: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
        bookings: sql<number>`count(distinct ${bookings.id})::int`,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.organizationId, organizationId),
          eq(bookings.status, 'completed'),
          isNull(bookings.deletedAt),
          gte(publishedSlots.startsAt, roughFrom),
          lt(publishedSlots.startsAt, roughTo),
        ),
      )
      .groupBy(sql`1, 2`);

    const result = new Map<string, Map<string, DayRevenue>>();
    for (const row of rows) {
      if (row.day < periodStart || row.day > periodEnd) continue;
      const days = result.get(row.memberId) ?? new Map<string, DayRevenue>();
      days.set(row.day, { amount: row.amount, bookings: row.bookings });
      result.set(row.memberId, days);
    }
    return result;
  }

  /** Ведомости, задевающие период: и черновики, и уже утверждённые. */
  payoutsOverlapping(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ id: string; organizationMemberId: string; status: PayoutRow['status'] }[]> {
    return this.db
      .select({
        id: payouts.id,
        organizationMemberId: payouts.organizationMemberId,
        status: payouts.status,
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.organizationId, organizationId),
          lte(payouts.periodStart, periodEnd),
          gte(payouts.periodEnd, periodStart),
        ),
      );
  }

  /**
   * Черновик мастера за период — заново.
   *
   * Прежние черновики, задевающие период, снимаются в той же транзакции: иначе
   * пересчёт «1–15» поверх «1–30» оставлял бы две ведомости на одни и те же
   * дни. Утверждённые и выплаченные сюда не доходят — их отсекает сервис, а
   * условие `status = 'draft'` в самом `DELETE` не даёт снять их даже в гонке.
   */
  replaceDraft(input: {
    organizationId: string;
    organizationMemberId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    result: PayoutCalculation;
    createdByUserId: string;
  }): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(payouts)
        .where(
          and(
            eq(payouts.organizationId, input.organizationId),
            eq(payouts.organizationMemberId, input.organizationMemberId),
            eq(payouts.status, 'draft'),
            lte(payouts.periodStart, input.periodEnd),
            gte(payouts.periodEnd, input.periodStart),
          ),
        );
      await tx.insert(payouts).values({
        organizationId: input.organizationId,
        organizationMemberId: input.organizationMemberId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        currency: input.currency,
        revenueAmount: input.result.revenue,
        bookingsCount: input.result.bookings,
        masterAmount: input.result.master,
        salonAmount: input.result.salon,
        breakdown: input.result.segments,
        createdByUserId: input.createdByUserId,
      });
    });
  }

  listPayouts(
    organizationId: string,
    filter: { from?: string; to?: string; onlyMemberId?: string; includeDrafts: boolean },
  ): Promise<PayoutView[]> {
    return this.db
      .select({
        id: payouts.id,
        organizationMemberId: payouts.organizationMemberId,
        memberName,
        periodStart: payouts.periodStart,
        periodEnd: payouts.periodEnd,
        currency: payouts.currency,
        revenueAmount: payouts.revenueAmount,
        bookingsCount: payouts.bookingsCount,
        masterAmount: payouts.masterAmount,
        salonAmount: payouts.salonAmount,
        breakdown: payouts.breakdown,
        status: payouts.status,
        approvedAt: payouts.approvedAt,
        paidAt: payouts.paidAt,
        createdAt: payouts.createdAt,
      })
      .from(payouts)
      .innerJoin(organizationMembers, eq(payouts.organizationMemberId, organizationMembers.id))
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(payouts.organizationId, organizationId),
          filter.onlyMemberId ? eq(payouts.organizationMemberId, filter.onlyMemberId) : undefined,
          filter.includeDrafts ? undefined : ne(payouts.status, 'draft'),
          filter.to ? lte(payouts.periodStart, filter.to) : undefined,
          filter.from ? gte(payouts.periodEnd, filter.from) : undefined,
        ),
      )
      .orderBy(desc(payouts.periodStart), asc(memberName))
      .limit(200);
  }

  async findPayout(
    organizationId: string,
    payoutId: string,
  ): Promise<{ id: string; status: PayoutRow['status']; organizationMemberId: string } | null> {
    const [row] = await this.db
      .select({
        id: payouts.id,
        status: payouts.status,
        organizationMemberId: payouts.organizationMemberId,
      })
      .from(payouts)
      .where(and(eq(payouts.id, payoutId), eq(payouts.organizationId, organizationId)));
    return row ?? null;
  }

  /**
   * Шаг ведомости вперёд: черновик → утверждена → выплачена.
   *
   * Исходный статус стоит в самом `WHERE`: двое, нажавшие «утвердить» и
   * «пересчитать» одновременно, не получат утверждённую ведомость со
   * сменившимися под ней суммами.
   */
  async advance(
    organizationId: string,
    payoutId: string,
    to: 'approved' | 'paid',
    userId: string,
  ): Promise<boolean> {
    const now = new Date();
    const [row] = await this.db
      .update(payouts)
      .set(
        to === 'approved'
          ? { status: 'approved', approvedByUserId: userId, approvedAt: now, updatedAt: now }
          : { status: 'paid', paidByUserId: userId, paidAt: now, updatedAt: now },
      )
      .where(
        and(
          eq(payouts.id, payoutId),
          eq(payouts.organizationId, organizationId),
          eq(payouts.status, to === 'approved' ? 'draft' : 'approved'),
        ),
      )
      .returning({ id: payouts.id });
    return Boolean(row);
  }

  async deleteDraft(organizationId: string, payoutId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(payouts)
      .where(
        and(
          eq(payouts.id, payoutId),
          eq(payouts.organizationId, organizationId),
          eq(payouts.status, 'draft'),
        ),
      )
      .returning({ id: payouts.id });
    return Boolean(row);
  }
}
