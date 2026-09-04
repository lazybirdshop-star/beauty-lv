import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, count, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import {
  subscriptionPlans,
  subscriptions,
  type SubscriptionRow,
} from '../../../shared/database/schema/subscriptions';
import { users, type UserRow } from '../../../shared/database/schema/users';
import { searchCondition, type AdminListPage, type AdminListRange } from './admin-list-query';

/**
 * Роль последнего администратора платформы снять нельзя.
 *
 * Живёт рядом с запросом, который единственный может это установить: ответ
 * зависит от того, сколько строк видит транзакция, а не от того, что знал
 * контроллер до неё.
 */
export class LastAdminError extends Error {
  constructor() {
    super('Нельзя снять роль у последнего администратора платформы');
  }
}

export interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
  /** Сколько дней покрывают два числа ниже — то, что выбрано на экране. */
  windowDays: number;
  /** Регистрации за выбранное окно и за такое же окно перед ним. */
  newRegistrations: number;
  previousRegistrations: number;
}

/** Окна, которые предлагает сводка. Свободного числа дней нет намеренно:
    вопрос у администратора календарный — «как прошла неделя», «как идёт
    квартал», — а произвольный отрезок это уже отчёт, а не сводка. */
export const SUMMARY_WINDOWS = [7, 30, 90] as const;
export type SummaryWindow = (typeof SUMMARY_WINDOWS)[number];

export function parseSummaryWindow(value: unknown): SummaryWindow {
  const days = Number(value);
  return (SUMMARY_WINDOWS as readonly number[]).includes(days) ? (days as SummaryWindow) : 7;
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
  /** Опубликована ли страница из Студии — то, что видит клиент по адресу. */
  pagePublished: boolean;
  /** Сколько записей получил основной салон мастера за всё время. */
  bookingsCount: number;
  planName: string | null;
  subscriptionStatus: SubscriptionRow['status'] | null;
}

/** Фильтр страницы: опубликована или нет. */
export const MASTER_PAGE_FILTERS = ['published', 'unpublished'] as const;
export type MasterPageFilter = (typeof MASTER_PAGE_FILTERS)[number];

/**
 * Фильтр подписки. `none` — не статус, а его отсутствие: мастер, у которой
 * подписки нет вовсе, не попадает ни под один статус, и без этого значения
 * найти её списком было бы нечем.
 */
export const MASTER_SUBSCRIPTION_FILTERS = ['active', 'frozen', 'cancelled', 'none'] as const;
export type MasterSubscriptionFilter = (typeof MASTER_SUBSCRIPTION_FILTERS)[number];

/**
 * Страница списка мастеров.
 *
 * `newLastWeek` считается по всей платформе, а не по отбору: в шапке экрана
 * это вторая половина фразы «1284 мастера · 38 новых за неделю», и она
 * отвечает на вопрос о платформе, а не о том, что человек сейчас отфильтровал.
 * Первую половину даёт `total`, и она как раз отбору подчиняется.
 */
export interface AdminMastersPage extends AdminListPage<AdminMasterRow> {
  newLastWeek: number;
}

/** Окна фильтра «зарегистрирована» — те же, что у сводки. */
export const MASTER_CREATED_WINDOWS = [7, 30, 90] as const;
export type MasterCreatedWindow = (typeof MASTER_CREATED_WINDOWS)[number];

export interface AdminMastersQuery extends AdminListRange {
  query?: string;
  status?: UserRow['accountStatus'];
  page?: MasterPageFilter;
  subscription?: MasterSubscriptionFilter;
  /** За сколько последних дней зарегистрирована. Без него — за всё время. */
  createdWithinDays?: MasterCreatedWindow;
}

export interface AdminUsersQuery extends AdminListRange {
  query?: string;
  role?: UserRow['systemRole'];
  status?: UserRow['accountStatus'];
  activity?: UserActivityFilter;
  createdWithinDays?: MasterCreatedWindow;
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

/**
 * Строка списка пользователей.
 *
 * «Последняя активность» в артборде — это время последнего входа, а его
 * продукт не пишет: отметка на каждом запросе стоила бы записи в базу на
 * каждый запрос. Вместо неё стоит последняя запись клиента — единственный
 * след, который платформа ведёт честно, и для вопроса «этот аккаунт живой»
 * он отвечает не хуже.
 */
export interface AdminUserRow extends SafeUserSummary {
  createdAt: Date;
  bookingsCount: number;
  lastBookingAt: Date | null;
}

/** Отбор активности из макета: были записи или ни одной. */
export const USER_ACTIVITY_FILTERS = ['booked', 'never'] as const;
export type UserActivityFilter = (typeof USER_ACTIVITY_FILTERS)[number];

/** Окна отбора «зарегистрирован» — те же, что у мастеров. */
export const USER_CREATED_WINDOWS = MASTER_CREATED_WINDOWS;

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
        /* Псевдоним обязателен: на сырое поле подзапроса без него нельзя
           сослаться снаружи — drizzle просто не знает, как его назвать. */
        pagePublished: sql<boolean>`${organizations.pageDesign} is not null`.as('page_published'),
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

  /**
   * Подписка организации — одна строка на салон.
   *
   * Строк подписки у салона со временем становится больше одной: истёкшая
   * остаётся лежать рядом с новой. Джойн без выбора удваивал бы мастера в
   * списке и показывал бы её то «активной», то «отменённой» — в зависимости
   * от того, какую строку вернул планировщик. Берётся самая свежая.
   */
  private latestSubscription() {
    return this.db
      .selectDistinctOn([subscriptions.organizationId], {
        organizationId: subscriptions.organizationId,
        status: subscriptions.status,
        planName: subscriptionPlans.name,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .orderBy(subscriptions.organizationId, desc(subscriptions.createdAt))
      .as('latest_subscription');
  }

  /**
   * Список мастеров — то, по чему в поддержке принимают решение.
   *
   * Кроме имени и почты строка несёт четыре вещи из артборда: опубликована ли
   * страница, сколько записей получил салон, что с подпиской и когда мастер
   * зарегистрировалась. Все четыре считаются одним запросом: тянуть их по
   * строке значит пятьдесят запросов на страницу списка.
   *
   * Записи считает коррелированный подзапрос, а не `join ... group by`:
   * группировка по пользователю схлопнула бы строки, которые и так уникальны,
   * и заставила бы перечислять в `GROUP BY` каждое выбранное поле.
   */
  async listMasters(query: AdminMastersQuery): Promise<AdminMastersPage> {
    const primary = this.primaryOrganization();
    const subscription = this.latestSubscription();

    /* Страница считается опубликованной по тому же признаку, что и в воронке
       и в карточке мастера: оформление из Студии сохранено. Мастер без салона
       под «опубликована» не подходит — у неё и адреса ещё нет. */
    const published = sql<boolean>`coalesce(${primary.pagePublished}, false)`;

    const createdSince =
      query.createdWithinDays === undefined
        ? undefined
        : new Date(Date.now() - query.createdWithinDays * 24 * 60 * 60 * 1000);

    const conditions: (SQL | undefined)[] = [
      eq(users.systemRole, 'master'),
      isNull(users.deletedAt),
      query.status ? eq(users.accountStatus, query.status) : undefined,
      query.page === 'published' ? eq(published, true) : undefined,
      query.page === 'unpublished' ? eq(published, false) : undefined,
      query.subscription === 'none' ? isNull(subscription.status) : undefined,
      query.subscription && query.subscription !== 'none'
        ? eq(subscription.status, query.subscription)
        : undefined,
      createdSince ? gte(users.createdAt, createdSince) : undefined,
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

    const [items, [totalRow], [newRow]] = await Promise.all([
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
          pagePublished: published,
          bookingsCount: sql<number>`(
            select count(*)::int from ${bookings}
            where ${bookings.organizationId} = ${primary.organizationId}
              and ${bookings.deletedAt} is null
          )`,
          planName: subscription.planName,
          subscriptionStatus: subscription.status,
        })
        .from(users)
        .leftJoin(primary, eq(primary.userId, users.id))
        .leftJoin(subscription, eq(subscription.organizationId, primary.organizationId))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(users)
        .leftJoin(primary, eq(primary.userId, users.id))
        .leftJoin(subscription, eq(subscription.organizationId, primary.organizationId))
        .where(where),
      this.db
        .select({ value: count() })
        .from(users)
        .where(
          and(
            eq(users.systemRole, 'master'),
            isNull(users.deletedAt),
            gte(users.createdAt, new Date(Date.now() - SEVEN_DAYS_MS)),
          ),
        ),
    ]);

    return { items, total: totalRow?.value ?? 0, newLastWeek: newRow?.value ?? 0 };
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

  /**
   * Пользователи — по артборду `AdminUsers.dc.html`.
   *
   * Кроме имени и связи строка несёт число записей и дату последней: вопрос,
   * ради которого экран открывают, звучит «этот аккаунт живой». Сортировка по
   * последней записи, а не по регистрации, — по той же причине; аккаунты без
   * единой записи уходят вниз, а не мешаются в начале.
   */
  async listUsers(query: AdminUsersQuery): Promise<AdminListPage<AdminUserRow>> {
    const bookingsCount = sql<number>`(
      select count(*)::int from ${bookings}
      where ${bookings.clientUserId} = ${users.id} and ${bookings.deletedAt} is null
    )`;
    const lastBookingAt = sql<Date | null>`(
      select max(${bookings.createdAt}) from ${bookings}
      where ${bookings.clientUserId} = ${users.id} and ${bookings.deletedAt} is null
    )`;

    const createdSince =
      query.createdWithinDays === undefined
        ? undefined
        : new Date(Date.now() - query.createdWithinDays * 24 * 60 * 60 * 1000);

    const conditions: (SQL | undefined)[] = [
      isNull(users.deletedAt),
      query.role ? eq(users.systemRole, query.role) : undefined,
      query.status ? eq(users.accountStatus, query.status) : undefined,
      query.activity === 'booked' ? sql`${bookingsCount} > 0` : undefined,
      query.activity === 'never' ? sql`${bookingsCount} = 0` : undefined,
      createdSince ? gte(users.createdAt, createdSince) : undefined,
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
          createdAt: users.createdAt,
          bookingsCount,
          lastBookingAt,
        })
        .from(users)
        .where(where)
        /* `nulls last`: аккаунт без записей не должен занимать начало списка
           только потому, что «ничего» в Postgres по убыванию идёт первым. */
        .orderBy(sql`${lastBookingAt} desc nulls last`, desc(users.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  /**
   * Сменить системную роль — кроме случая, когда это последний администратор.
   *
   * Пересчёт и `UPDATE` идут одной транзакцией, и строки администраторов
   * блокируются `FOR UPDATE`. Без блокировки двое администраторов, разжалующие
   * друг друга одновременно, оба увидят «нас двое» и оба пройдут: платформа
   * остаётся без администратора, а вернуть роль после этого может только
   * прямой `UPDATE` в базе. Это единственное состояние продукта, из которого
   * нет выхода через его же интерфейс.
   */
  async setSystemRole(
    userId: string,
    systemRole: UserRow['systemRole'],
  ): Promise<SafeUserSummary | null> {
    return this.db.transaction(async (tx) => {
      if (systemRole !== 'platform_admin') {
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.systemRole, 'platform_admin'), isNull(users.deletedAt)))
          .for('update');

        if (admins.length <= 1 && admins.some((admin) => admin.id === userId)) {
          throw new LastAdminError();
        }
      }

      const [user] = await tx
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
    });
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

  async getDashboardSummary(windowDays: SummaryWindow = 7): Promise<AdminDashboardSummary> {
    const dayMs = 24 * 60 * 60 * 1000;
    const from = new Date(Date.now() - windowDays * dayMs);
    /* Предыдущее окно той же длины: «+12% к прошлому» имеет смысл только
       против такого же срока, а не против «всего, что было раньше». */
    const previousFrom = new Date(Date.now() - windowDays * 2 * dayMs);
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    /* Удалённый аккаунт не считается нигде. Иначе сводка на главной
       расходится со списком под ней — «мастеров 42», а в списке сорок, — и
       администратор перестаёт верить обоим числам. */
    const [
      [masters],
      [clients],
      [orgs],
      [newRegistrations],
      [bookingsRow],
      [activeSubs],
      [inWindow],
      [inPreviousWindow],
    ] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.systemRole, 'master'), isNull(users.deletedAt))),
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.systemRole, 'client'), isNull(users.deletedAt))),
      this.db.select({ value: count() }).from(organizations).where(isNull(organizations.deletedAt)),
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(gte(users.createdAt, sevenDaysAgo), isNull(users.deletedAt))),
      this.db.select({ value: count() }).from(bookings).where(isNull(bookings.deletedAt)),
      this.db
        .select({ value: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active')),
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(gte(users.createdAt, from), isNull(users.deletedAt))),
      this.db
        .select({ value: count() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, previousFrom),
            lt(users.createdAt, from),
            isNull(users.deletedAt),
          ),
        ),
    ]);

    return {
      mastersCount: masters?.value ?? 0,
      clientsCount: clients?.value ?? 0,
      organizationsCount: orgs?.value ?? 0,
      newRegistrationsLast7Days: newRegistrations?.value ?? 0,
      bookingsCount: bookingsRow?.value ?? 0,
      activeSubscriptionsCount: activeSubs?.value ?? 0,
      windowDays,
      newRegistrations: inWindow?.value ?? 0,
      previousRegistrations: inPreviousWindow?.value ?? 0,
    };
  }
}
