import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { publishedSlots } from '../../../shared/database/schema/published-slots';

export interface MonthlyRevenue {
  /** `YYYY-MM` */
  month: string;
  revenue: number;
  bookings: number;
}

export interface ServiceRevenue {
  serviceName: string;
  revenue: number;
  bookings: number;
}

export interface FinanceSummary {
  currency: string;
  totalRevenue: number;
  averageCheck: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  byMonth: MonthlyRevenue[];
  byService: ServiceRevenue[];
}

const MONTHS_BACK = 11;

/** Only completed visits count as revenue — see the controller's doc comment. */
const REVENUE_STATUS = 'completed' as const;

@Injectable()
export class FinanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getSummary(organizationId: string): Promise<FinanceSummary> {
    const since = new Date();
    since.setMonth(since.getMonth() - MONTHS_BACK, 1);
    since.setHours(0, 0, 0, 0);

    const [byMonth, byService, statusCounts, totals] = await Promise.all([
      this.db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${publishedSlots.startsAt}), 'YYYY-MM')`,
          revenue: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
          bookings: sql<number>`count(distinct ${bookings.id})::int`,
        })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            eq(bookings.status, REVENUE_STATUS),
            gte(publishedSlots.startsAt, since),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),

      this.db
        .select({
          serviceName: bookingItems.serviceNameSnapshot,
          revenue: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
          bookings: sql<number>`count(distinct ${bookings.id})::int`,
        })
        .from(bookings)
        .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
        .where(
          and(eq(bookings.organizationId, organizationId), eq(bookings.status, REVENUE_STATUS)),
        )
        .groupBy(bookingItems.serviceNameSnapshot)
        .orderBy(sql`2 desc`),

      this.db
        .select({
          status: bookings.status,
          value: sql<number>`count(*)::int`,
        })
        .from(bookings)
        .where(eq(bookings.organizationId, organizationId))
        .groupBy(bookings.status),

      this.db
        .select({
          revenue: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
          currency: sql<string>`coalesce(max(${bookingItems.priceCurrencySnapshot}), 'EUR')`,
          completed: sql<number>`count(distinct ${bookings.id})::int`,
        })
        .from(bookings)
        .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
        .where(
          and(eq(bookings.organizationId, organizationId), eq(bookings.status, REVENUE_STATUS)),
        ),
    ]);

    const counts = new Map(statusCounts.map((row) => [row.status, row.value]));
    const cancelledCount =
      (counts.get('cancelled_by_client') ?? 0) + (counts.get('cancelled_by_master') ?? 0);
    const totalRow = totals[0];
    const completedCount = totalRow?.completed ?? 0;

    return {
      currency: totalRow?.currency ?? 'EUR',
      totalRevenue: totalRow?.revenue ?? 0,
      // Rounded to whole minor units — a fractional cent per visit is noise.
      averageCheck: completedCount > 0 ? Math.round((totalRow?.revenue ?? 0) / completedCount) : 0,
      completedCount,
      cancelledCount,
      noShowCount: counts.get('no_show') ?? 0,
      byMonth,
      byService,
    };
  }
}
