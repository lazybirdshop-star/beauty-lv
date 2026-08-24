import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '@amolie/shared-kernel';
import { and, eq, gte, lt, sql, type SQL } from 'drizzle-orm';

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
  /**
   * Доход за столько же времени непосредственно перед выбранным отрезком.
   *
   * `null`, когда сравнивать не с чем: отрезок не задан (мастер смотрит «всё
   * время»), и «предыдущего всего времени» не существует. Разница между этим
   * числом и `totalRevenue` — единственное, ради чего сумма вообще что-то
   * значит: «3 200 €» не говорит ничего, «3 200 €, на 12% больше прошлого
   * месяца» говорит всё.
   */
  previousRevenue: number | null;
  byMonth: MonthlyRevenue[];
  byService: ServiceRevenue[];
}

/** Only completed visits count as revenue — see the controller's doc comment. */
const REVENUE_STATUS = 'completed' as const;

@Injectable()
export class FinanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Сводка по доходу за отрезок времени — или за всё время, если отрезка нет.
   *
   * Отрезок применяется ко **всем** числам разом, и это исправление, а не
   * новая возможность. График по месяцам был ограничен последним годом, а
   * сумма, средний чек, процент отмен и разбивка по услугам считались за всё
   * время: экран показывал годовой график над всевременными итогами и нигде об
   * этом не говорил. Мастер второго года работы читала «доход 8 400 €» рядом с
   * графиком, где столбцов на 4 100 €, и оба числа были правдой про разное.
   *
   * Отбор идёт по времени **визита** (`published_slots.starts_at`), а не по
   * времени создания записи: доход принадлежит тому месяцу, когда мастер
   * работала, а не тому, когда клиент нажал кнопку.
   */
  async getSummary(
    organizationId: string,
    window: { from?: Date; to?: Date } = {},
  ): Promise<FinanceSummary> {
    /* Границы отрезка считает кабинет — он знает пояс салона (см.
       `TimeWindowDto`). Здесь они только раскладываются по трём выборкам,
       которым нужен визит, и одной, которой нужна сама запись. */
    const visitWithin = (): SQL[] => {
      const conditions: SQL[] = [];
      if (window.from) conditions.push(gte(publishedSlots.startsAt, window.from));
      if (window.to) conditions.push(lt(publishedSlots.startsAt, window.to));
      return conditions;
    };

    const [byMonth, byService, statusCounts, totals, previous] = await Promise.all([
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
            ...visitWithin(),
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
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            eq(bookings.status, REVENUE_STATUS),
            ...visitWithin(),
          ),
        )
        .groupBy(bookingItems.serviceNameSnapshot)
        .orderBy(sql`2 desc`),

      this.db
        .select({
          status: bookings.status,
          value: sql<number>`count(*)::int`,
        })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .where(and(eq(bookings.organizationId, organizationId), ...visitWithin()))
        .groupBy(bookings.status),

      this.db
        .select({
          revenue: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
          currency: sql<string>`coalesce(max(${bookingItems.priceCurrencySnapshot}), ${DEFAULT_CURRENCY})`,
          completed: sql<number>`count(distinct ${bookings.id})::int`,
        })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            eq(bookings.status, REVENUE_STATUS),
            ...visitWithin(),
          ),
        ),

      this.previousRevenue(organizationId, window),
    ]);

    const counts = new Map(statusCounts.map((row) => [row.status, row.value]));
    const cancelledCount =
      (counts.get('cancelled_by_client') ?? 0) + (counts.get('cancelled_by_master') ?? 0);
    const totalRow = totals[0];
    const completedCount = totalRow?.completed ?? 0;

    return {
      currency: totalRow?.currency ?? DEFAULT_CURRENCY,
      totalRevenue: totalRow?.revenue ?? 0,
      // Rounded to whole minor units — a fractional cent per visit is noise.
      averageCheck: completedCount > 0 ? Math.round((totalRow?.revenue ?? 0) / completedCount) : 0,
      completedCount,
      cancelledCount,
      noShowCount: counts.get('no_show') ?? 0,
      previousRevenue: previous,
      byMonth,
      byService,
    };
  }

  /**
   * Доход за столько же времени непосредственно перед выбранным отрезком.
   *
   * Правило одно и не требует от кабинета второй пары границ: предыдущий
   * период — это отрезок той же длины, вплотную примыкающий слева. Для «этого
   * месяца» это прошлый месяц, для «трёх месяцев» — три предыдущих.
   *
   * Требует обеих границ. Открытый отрезок сравнивать не с чем: у «всего
   * времени» нет предыдущего всего времени, а у отрезка без правого конца
   * длина не определена — и оба случая честнее вернуть как `null`, чем
   * подставить число, которое мастер прочтёт как сравнение.
   */
  private async previousRevenue(
    organizationId: string,
    window: { from?: Date; to?: Date },
  ): Promise<number | null> {
    if (!window.from || !window.to) return null;

    const length = window.to.getTime() - window.from.getTime();
    const previousFrom = new Date(window.from.getTime() - length);

    const [row] = await this.db
      .select({
        revenue: sql<number>`coalesce(sum(${bookingItems.priceAmountSnapshot}), 0)::int`,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.organizationId, organizationId),
          eq(bookings.status, REVENUE_STATUS),
          gte(publishedSlots.startsAt, previousFrom),
          lt(publishedSlots.startsAt, window.from),
        ),
      );

    return row?.revenue ?? 0;
  }
}
