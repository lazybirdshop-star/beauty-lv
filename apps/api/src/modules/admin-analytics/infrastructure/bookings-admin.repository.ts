import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, count, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';

import { bookingItems, bookings, type BookingRow } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { searchCondition, type AdminListPage, type AdminListRange } from './admin-list-query';

export interface AdminBookingsQuery extends AdminListRange {
  query?: string;
  status?: BookingRow['status'];
  /** Полуинтервал `[from, to)` по времени визита — как везде в продукте. */
  from?: Date;
  to?: Date;
}

/**
 * Запись глазами платформы.
 *
 * До сих пор записи существовали в админке единственным числом на главной.
 * Разобрать жалобу — «клиент говорит, что записался, а мастер записи не
 * видит» — было нечем: список записей есть только внутри кабинета, куда у
 * платформы входа нет.
 */
export interface AdminBookingRow {
  id: string;
  status: BookingRow['status'];
  source: BookingRow['source'];
  startsAt: Date;
  createdAt: Date;
  guestName: string | null;
  guestPhone: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  /** Сумма позиций в минорных единицах — то, во что визит обошёлся клиенту. */
  totalAmount: number;
  serviceNames: string[];
}

@Injectable()
export class BookingsAdminRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(query: AdminBookingsQuery): Promise<AdminListPage<AdminBookingRow>> {
    const conditions: (SQL | undefined)[] = [
      isNull(bookings.deletedAt),
      query.status ? eq(bookings.status, query.status) : undefined,
      query.from ? gte(publishedSlots.startsAt, query.from) : undefined,
      query.to ? lt(publishedSlots.startsAt, query.to) : undefined,
      searchCondition(query.query, [
        bookings.guestName,
        bookings.guestPhone,
        organizations.name,
        organizations.slug,
      ]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: bookings.id,
          status: bookings.status,
          source: bookings.source,
          startsAt: publishedSlots.startsAt,
          createdAt: bookings.createdAt,
          guestName: bookings.guestName,
          guestPhone: bookings.guestPhone,
          organizationId: organizations.id,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
        })
        .from(bookings)
        .innerJoin(publishedSlots, eq(publishedSlots.id, bookings.publishedSlotId))
        .innerJoin(organizations, eq(organizations.id, bookings.organizationId))
        .where(where)
        /* Порядок — по времени **создания** записи, а не визита: платформа
           смотрит на этот список как на ленту событий («что записалось за
           последние часы»), а не как на чьё-то расписание. Запись, оформленную
           минуту назад на март, иначе пришлось бы искать где-то в глубине
           страниц — ровно тогда, когда её и разбирают.

           Вторым ключом id: created_at у двух записей может совпасть, и без
           устойчивого порядка постраничная выборка теряла бы и дублировала
           строки на границе страниц. */
        .orderBy(desc(bookings.createdAt), desc(bookings.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(bookings)
        .innerJoin(publishedSlots, eq(publishedSlots.id, bookings.publishedSlotId))
        .innerJoin(organizations, eq(organizations.id, bookings.organizationId))
        .where(where),
    ]);

    return { items: await this.withItems(rows), total: totalRow?.value ?? 0 };
  }

  /**
   * Услуги и сумма — вторым запросом, а не джойном.
   *
   * Джойн размножил бы запись по числу позиций, и собирать её обратно
   * пришлось бы всё равно — только уже из декартова произведения. То же
   * решение, что в репозитории записей кабинета.
   */
  private async withItems(
    rows: Omit<AdminBookingRow, 'totalAmount' | 'serviceNames'>[],
  ): Promise<AdminBookingRow[]> {
    if (rows.length === 0) return [];

    const items = await this.db
      .select({
        bookingId: bookingItems.bookingId,
        name: bookingItems.serviceNameSnapshot,
        price: bookingItems.priceAmountSnapshot,
      })
      .from(bookingItems)
      .where(
        inArray(
          bookingItems.bookingId,
          rows.map((row) => row.id),
        ),
      );

    return rows.map((row) => {
      const own = items.filter((item) => item.bookingId === row.id);
      return {
        ...row,
        serviceNames: own.map((item) => item.name),
        totalAmount: own.reduce((sumSoFar, item) => sumSoFar + item.price, 0),
      };
    });
  }
}
