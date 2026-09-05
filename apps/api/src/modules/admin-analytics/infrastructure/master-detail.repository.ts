import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
import { pageDesignVersions } from '../../../shared/database/schema/page-design-versions';
import { serviceCategories } from '../../../shared/database/schema/service-categories';
import { services } from '../../../shared/database/schema/services';
import { subscriptionPlans, subscriptions } from '../../../shared/database/schema/subscriptions';
import { users, type UserRow } from '../../../shared/database/schema/users';

/**
 * Салон мастера глазами платформы.
 *
 * Не «организация целиком»: половина колонок `organizations` описывает
 * внешний вид публичной страницы, и администратору они не говорят ничего.
 * Здесь только то, по чему принимают решение в поддержке — жив ли салон,
 * работает ли страница, есть ли в нём хоть что-то, и чем он платит.
 */
export interface AdminMasterOrganization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationRow['type'];
  status: OrganizationRow['status'];
  /** Роль мастера **в этом** салоне: владелец, администратор или мастер. */
  role: string;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
  /** Опубликована ли страница из Студии — то, что видит клиент по адресу. */
  pagePublished: boolean;
  /** Когда страницу опубликовали в последний раз — из истории версий. */
  pagePublishedAt: Date | null;
  /** Оформление, выбранное в Студии, — «Soft Studio · Pink accent» макета. */
  designPresetKey: string;
  themePresetKey: string;
  servicesCount: number;
  categoriesCount: number;
  clientsCount: number;
  bookingsCount: number;
  /** Записи за 30 дней и отменённые — три числа карточки из артборда. */
  bookings30dCount: number;
  cancelledCount: number;
  /** Когда салон получил последнюю запись — самый честный признак жизни. */
  lastBookingAt: Date | null;
  planName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}

/**
 * Карточка мастера.
 *
 * До неё список был тупиком: провалиться было некуда, и разбор любой жалобы
 * начинался с запросов к базе руками. Хеша пароля и версии токена здесь нет
 * и быть не может — ни один экран их не показывает, а утечь они могут через
 * любой лог.
 */
export interface AdminMasterDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  locale: string;
  systemRole: UserRow['systemRole'];
  accountStatus: UserRow['accountStatus'];
  createdAt: Date;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  /** Заметка платформы об этом аккаунте — то, что помнит поддержка. */
  adminNote: string | null;
  organizations: AdminMasterOrganization[];
}

interface OrganizationCounts {
  servicesCount: number;
  categoriesCount: number;
  clientsCount: number;
  bookingsCount: number;
  bookings30dCount: number;
  cancelledCount: number;
  lastBookingAt: Date | null;
}

const EMPTY_COUNTS: OrganizationCounts = {
  servicesCount: 0,
  categoriesCount: 0,
  clientsCount: 0,
  bookingsCount: 0,
  bookings30dCount: 0,
  cancelledCount: 0,
  lastBookingAt: null,
};

@Injectable()
export class MasterDetailRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async find(userId: string): Promise<AdminMasterDetail | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        locale: users.locale,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
        emailVerifiedAt: users.emailVerifiedAt,
        phoneVerifiedAt: users.phoneVerifiedAt,
        adminNote: users.adminNote,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    if (!user) return null;

    return { ...user, organizations: await this.organizationsOf(userId) };
  }

  /**
   * Все салоны мастера, а не один основной.
   *
   * Список показывает основной — на карточке скрывать остальные нельзя:
   * «мастер жалуется, что пропали записи» решается тем, в каком именно
   * салоне она их ищет.
   */
  private async organizationsOf(userId: string): Promise<AdminMasterOrganization[]> {
    const memberships = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        status: organizations.status,
        role: organizationMembers.role,
        createdAt: organizations.createdAt,
        onboardingCompletedAt: organizations.onboardingCompletedAt,
        /* Само оформление наружу не отдаётся — важен только факт публикации. */
        pagePublished: sql<boolean>`${organizations.pageDesign} is not null`,
        /* Дата публикации — из истории версий: сама колонка `page_design`
           хранит только текущее оформление и о своём возрасте не знает. */
        pagePublishedAt: sql<Date | null>`(
          select max(${pageDesignVersions.publishedAt}) from ${pageDesignVersions}
          where ${pageDesignVersions.organizationId} = ${organizations.id}
        )`,
        designPresetKey: organizations.designPresetKey,
        themePresetKey: organizations.themePresetKey,
        planName: subscriptionPlans.name,
        subscriptionStatus: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          isNull(organizationMembers.deletedAt),
          isNull(organizations.deletedAt),
        ),
      )
      .orderBy(organizations.createdAt);

    if (memberships.length === 0) return [];

    const counts = await this.countsFor(memberships.map((membership) => membership.id));

    return memberships.map((membership) => ({
      ...membership,
      ...(counts.get(membership.id) ?? EMPTY_COUNTS),
    }));
  }

  /**
   * Три счётчика на салон — тремя запросами, а не тремя подзапросами в одном.
   *
   * Считаются разные таблицы с разными условиями живости, и сведённые в один
   * запрос через `JOIN` они множили бы строки друг друга: классический способ
   * получить «услуг 240» там, где их двенадцать.
   */
  private async countsFor(organizationIds: string[]): Promise<Map<string, OrganizationCounts>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [serviceRows, categoryRows, clientRows, bookingRows] = await Promise.all([
      this.db
        .select({ organizationId: services.organizationId, value: count() })
        .from(services)
        .where(and(inArray(services.organizationId, organizationIds), isNull(services.deletedAt)))
        .groupBy(services.organizationId),
      this.db
        .select({ organizationId: serviceCategories.organizationId, value: count() })
        .from(serviceCategories)
        .where(
          and(
            inArray(serviceCategories.organizationId, organizationIds),
            isNull(serviceCategories.deletedAt),
          ),
        )
        .groupBy(serviceCategories.organizationId),
      this.db
        .select({ organizationId: clients.organizationId, value: count() })
        .from(clients)
        .where(and(inArray(clients.organizationId, organizationIds), isNull(clients.deletedAt)))
        .groupBy(clients.organizationId),
      this.db
        .select({
          organizationId: bookings.organizationId,
          value: count(),
          /* Три числа карточки — одним проходом по таблице: отдельный запрос
             ради каждого означал бы три прохода по одним и тем же строкам. */
          last30d: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${thirtyDaysAgo})::int`,
          cancelled: sql<number>`count(*) filter (where ${bookings.status} in ('cancelled_by_client', 'cancelled_by_master'))::int`,
          lastCreatedAt: max(bookings.createdAt),
        })
        .from(bookings)
        .where(and(inArray(bookings.organizationId, organizationIds), isNull(bookings.deletedAt)))
        .groupBy(bookings.organizationId),
    ]);

    const result = new Map<string, OrganizationCounts>();

    for (const organizationId of organizationIds) {
      const bookingRow = bookingRows.find((row) => row.organizationId === organizationId);
      result.set(organizationId, {
        servicesCount: serviceRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        categoriesCount:
          categoryRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        clientsCount: clientRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        bookingsCount: bookingRow?.value ?? 0,
        bookings30dCount: bookingRow?.last30d ?? 0,
        cancelledCount: bookingRow?.cancelled ?? 0,
        lastBookingAt: bookingRow?.lastCreatedAt ?? null,
      });
    }

    return result;
  }

  /** Заметка платформы об аккаунте. Пустая строка стирает её. */
  async setAdminNote(userId: string, note: string): Promise<boolean> {
    const [row] = await this.db
      .update(users)
      .set({ adminNote: note.trim() || null, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });

    return Boolean(row);
  }
}
