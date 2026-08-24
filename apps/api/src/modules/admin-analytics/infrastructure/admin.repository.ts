import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { subscriptions } from '../../../shared/database/schema/subscriptions';
import { users, type UserRow } from '../../../shared/database/schema/users';
import { searchCondition, type AdminListPage, type AdminListRange } from './admin-list-query';

export interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
}

export interface AdminMasterRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  accountStatus: UserRow['accountStatus'];
  createdAt: Date;
  organizationSlug: string | null;
  organizationName: string | null;
}

export interface AdminMastersQuery extends AdminListRange {
  query?: string;
  status?: UserRow['accountStatus'];
}

export interface AdminUsersQuery extends AdminListRange {
  query?: string;
  role?: UserRow['systemRole'];
  status?: UserRow['accountStatus'];
}

export interface WeeklyPoint {
  /** Monday of the ISO week, `YYYY-MM-DD`. */
  week: string;
  value: number;
}

export interface AdminWeeklyTrends {
  registrations: WeeklyPoint[];
  bookings: WeeklyPoint[];
}

/** Never the full `UserRow` over the wire — that includes `passwordHash`. */
export interface SafeUserSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  systemRole: UserRow['systemRole'];
  accountStatus: UserRow['accountStatus'];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Организация мастера — ровно одна строка на человека.
   *
   * До этого список джойнил `organization_members` напрямую, и мастер,
   * состоящая в двух салонах, появлялась в нём дважды — с двумя кнопками
   * «Заблокировать», делающими одно и то же. `DISTINCT ON` выбирает
   * основную организацию детерминированно: сначала ту, где она владелец,
   * при равенстве — самую раннюю.
   *
   * Удалённые членства, удалённые организации и приглашённые-но-не-вошедшие
   * участники в выбор не попадают: администратору нужен адрес страницы,
   * которая сейчас отвечает клиентам, а не любая, к которой мастер была
   * когда-то привязана.
   */
  private primaryOrganization() {
    return this.db
      .selectDistinctOn([organizationMembers.userId], {
        userId: organizationMembers.userId,
        organizationId: organizations.id,
        organizationSlug: organizations.slug,
        organizationName: organizations.name,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(
        and(
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
          isNull(organizations.deletedAt),
        ),
      )
      .orderBy(
        organizationMembers.userId,
        sql`case when ${organizationMembers.role} = 'owner' then 0 else 1 end`,
        organizations.createdAt,
      )
      .as('primary_organization');
  }

  async listMasters(query: AdminMastersQuery): Promise<AdminListPage<AdminMasterRow>> {
    const primary = this.primaryOrganization();

    const conditions: (SQL | undefined)[] = [
      eq(users.systemRole, 'master'),
      isNull(users.deletedAt),
      query.status ? eq(users.accountStatus, query.status) : undefined,
      searchCondition(query.query, [
        users.fullName,
        users.email,
        users.phone,
        primary.organizationName,
        primary.organizationSlug,
      ]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          accountStatus: users.accountStatus,
          createdAt: users.createdAt,
          organizationSlug: primary.organizationSlug,
          organizationName: primary.organizationName,
        })
        .from(users)
        .leftJoin(primary, eq(primary.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(users)
        .leftJoin(primary, eq(primary.userId, users.id))
        .where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  async setAccountStatus(
    userId: string,
    accountStatus: UserRow['accountStatus'],
  ): Promise<SafeUserSummary | null> {
    const [user] = await this.db
      .update(users)
      .set({ accountStatus, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
      });
    return user ?? null;
  }

  async listUsers(query: AdminUsersQuery): Promise<AdminListPage<SafeUserSummary>> {
    const conditions: (SQL | undefined)[] = [
      isNull(users.deletedAt),
      query.role ? eq(users.systemRole, query.role) : undefined,
      query.status ? eq(users.accountStatus, query.status) : undefined,
      searchCondition(query.query, [users.fullName, users.email, users.phone]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          systemRole: users.systemRole,
          accountStatus: users.accountStatus,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  async setSystemRole(
    userId: string,
    systemRole: UserRow['systemRole'],
  ): Promise<SafeUserSummary | null> {
    const [user] = await this.db
      .update(users)
      .set({ systemRole, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
      });
    return user ?? null;
  }

  /**
   * Registrations and bookings per ISO week. Returned as two independent
   * series that the UI renders as two charts — never one chart with two
   * y-scales, which is the classic way to make unrelated magnitudes look
   * correlated.
   */
  async getWeeklyTrends(weeks = 12): Promise<AdminWeeklyTrends> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    since.setHours(0, 0, 0, 0);

    const weekExpr = (column: PgColumn) =>
      sql<string>`to_char(date_trunc('week', ${column}), 'YYYY-MM-DD')`;

    const [registrations, bookingsPerWeek] = await Promise.all([
      this.db
        .select({ week: weekExpr(users.createdAt), value: sql<number>`count(*)::int` })
        .from(users)
        .where(and(gte(users.createdAt, since), isNull(users.deletedAt)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      this.db
        .select({ week: weekExpr(bookings.createdAt), value: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(gte(bookings.createdAt, since), isNull(bookings.deletedAt)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

    return { registrations, bookings: bookingsPerWeek };
  }

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    /* Удалённый аккаунт не считается нигде. Иначе сводка на главной
       расходится со списком под ней — «мастеров 42», а в списке сорок, — и
       администратор перестаёт верить обоим числам. */
    const [[masters], [clients], [orgs], [newRegistrations], [bookingsRow], [activeSubs]] =
      await Promise.all([
        this.db
          .select({ value: count() })
          .from(users)
          .where(and(eq(users.systemRole, 'master'), isNull(users.deletedAt))),
        this.db
          .select({ value: count() })
          .from(users)
          .where(and(eq(users.systemRole, 'client'), isNull(users.deletedAt))),
        this.db
          .select({ value: count() })
          .from(organizations)
          .where(isNull(organizations.deletedAt)),
        this.db
          .select({ value: count() })
          .from(users)
          .where(and(gte(users.createdAt, sevenDaysAgo), isNull(users.deletedAt))),
        this.db.select({ value: count() }).from(bookings).where(isNull(bookings.deletedAt)),
        this.db
          .select({ value: count() })
          .from(subscriptions)
          .where(eq(subscriptions.status, 'active')),
      ]);

    return {
      mastersCount: masters?.value ?? 0,
      clientsCount: clients?.value ?? 0,
      organizationsCount: orgs?.value ?? 0,
      newRegistrationsLast7Days: newRegistrations?.value ?? 0,
      bookingsCount: bookingsRow?.value ?? 0,
      activeSubscriptionsCount: activeSubs?.value ?? 0,
    };
  }
}
