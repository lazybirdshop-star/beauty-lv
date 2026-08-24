import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, count, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
import { subscriptionPlans, subscriptions } from '../../../shared/database/schema/subscriptions';
import { users } from '../../../shared/database/schema/users';
import { searchCondition, type AdminListPage, type AdminListRange } from './admin-list-query';

export interface AdminOrganizationsQuery extends AdminListRange {
  query?: string;
  status?: OrganizationRow['status'];
}

/**
 * Салон в списке платформы.
 *
 * Объект управления у платформы — организация, а не человек: у неё адрес,
 * публичная страница, подписка и состояние. До этого раздела не было вовсе,
 * хотя эндпоинт `GET /admin/organizations` уже существовал и не имел ни
 * одного экрана.
 */
export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  type: OrganizationRow['type'];
  status: OrganizationRow['status'];
  createdAt: Date;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  pagePublished: boolean;
  mastersCount: number;
  bookingsCount: number;
  lastBookingAt: Date | null;
  planName: string | null;
  subscriptionStatus: string | null;
}

@Injectable()
export class OrganizationsAdminRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(query: AdminOrganizationsQuery): Promise<AdminListPage<AdminOrganizationRow>> {
    const conditions: (SQL | undefined)[] = [
      isNull(organizations.deletedAt),
      query.status ? eq(organizations.status, query.status) : undefined,
      searchCondition(query.query, [
        organizations.name,
        organizations.slug,
        organizations.city,
        users.fullName,
        users.email,
      ]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [rows, [totalRow]] = await Promise.all([
      this.selectRows(where)
        .orderBy(desc(organizations.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(organizations)
        .leftJoin(users, eq(users.id, organizations.ownerUserId))
        .where(where),
    ]);

    return { items: await this.withCounts(rows), total: totalRow?.value ?? 0 };
  }

  /** Один салон в том же виде, в каком он приходит списком. */
  async findById(organizationId: string): Promise<AdminOrganizationRow | null> {
    const rows = await this.selectRows(
      and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
    );
    const [row] = await this.withCounts(rows);
    return row ?? null;
  }

  /**
   * Строка салона без счётчиков — общая часть списка и одиночного чтения.
   *
   * Подписка и тариф подтягиваются `LEFT JOIN`: салон без подписки обязан
   * остаться в списке, иначе панель перестанет показывать ровно тех, к кому
   * есть вопросы по оплате.
   */
  private selectRows(where: SQL | undefined) {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        status: organizations.status,
        createdAt: organizations.createdAt,
        ownerId: users.id,
        ownerName: users.fullName,
        ownerEmail: users.email,
        /* Наружу уходит только факт публикации: само оформление — это
           килобайты JSON, которые списку не нужны. */
        pagePublished: sql<boolean>`${organizations.pageDesign} is not null`,
        planName: subscriptionPlans.name,
        subscriptionStatus: subscriptions.status,
      })
      .from(organizations)
      .leftJoin(users, eq(users.id, organizations.ownerUserId))
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(where);
  }

  private async withCounts(
    rows: Awaited<ReturnType<OrganizationsAdminRepository['selectRows']>>,
  ): Promise<AdminOrganizationRow[]> {
    const counts = await this.countsFor(rows.map((row) => row.id));
    return rows.map((row) => ({
      ...row,
      ...(counts.get(row.id) ?? { mastersCount: 0, bookingsCount: 0, lastBookingAt: null }),
    }));
  }

  /**
   * Счётчики считаются только для строк текущей страницы.
   *
   * Не для всей таблицы: страница — пятьдесят салонов, а платформа однажды
   * будет тысячами, и сводить их одним запросом с `JOIN` к списку значит
   * множить строки записями каждого салона.
   */
  private async countsFor(
    organizationIds: string[],
  ): Promise<
    Map<string, { mastersCount: number; bookingsCount: number; lastBookingAt: Date | null }>
  > {
    const result = new Map<
      string,
      { mastersCount: number; bookingsCount: number; lastBookingAt: Date | null }
    >();
    if (organizationIds.length === 0) return result;

    const [memberRows, bookingRows] = await Promise.all([
      this.db
        .select({ organizationId: organizationMembers.organizationId, value: count() })
        .from(organizationMembers)
        .where(
          and(
            inArray(organizationMembers.organizationId, organizationIds),
            eq(organizationMembers.status, 'active'),
            isNull(organizationMembers.deletedAt),
          ),
        )
        .groupBy(organizationMembers.organizationId),
      this.db
        .select({
          organizationId: bookings.organizationId,
          value: count(),
          lastCreatedAt: max(bookings.createdAt),
        })
        .from(bookings)
        .where(and(inArray(bookings.organizationId, organizationIds), isNull(bookings.deletedAt)))
        .groupBy(bookings.organizationId),
    ]);

    for (const organizationId of organizationIds) {
      const bookingRow = bookingRows.find((row) => row.organizationId === organizationId);
      result.set(organizationId, {
        mastersCount: memberRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        bookingsCount: bookingRow?.value ?? 0,
        lastBookingAt: bookingRow?.lastCreatedAt ?? null,
      });
    }

    return result;
  }

  /**
   * Смена состояния салона.
   *
   * Удалённый салон не воскрешается: строки с `deleted_at` для платформы уже
   * нет, и «разархивировать» её значило бы вернуть клиентам страницу, которую
   * мастер закрыла.
   */
  async setStatus(
    organizationId: string,
    status: OrganizationRow['status'],
  ): Promise<AdminOrganizationRow | null> {
    const [updated] = await this.db
      .update(organizations)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
      .returning({ id: organizations.id });

    return updated ? this.findById(organizationId) : null;
  }
}
