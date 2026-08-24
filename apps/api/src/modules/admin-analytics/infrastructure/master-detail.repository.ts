import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
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
  servicesCount: number;
  clientsCount: number;
  bookingsCount: number;
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
  organizations: AdminMasterOrganization[];
}

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
      ...(counts.get(membership.id) ?? {
        servicesCount: 0,
        clientsCount: 0,
        bookingsCount: 0,
        lastBookingAt: null,
      }),
    }));
  }

  /**
   * Три счётчика на салон — тремя запросами, а не тремя подзапросами в одном.
   *
   * Считаются разные таблицы с разными условиями живости, и сведённые в один
   * запрос через `JOIN` они множили бы строки друг друга: классический способ
   * получить «услуг 240» там, где их двенадцать.
   */
  private async countsFor(organizationIds: string[]): Promise<
    Map<
      string,
      {
        servicesCount: number;
        clientsCount: number;
        bookingsCount: number;
        lastBookingAt: Date | null;
      }
    >
  > {
    const [serviceRows, clientRows, bookingRows] = await Promise.all([
      this.db
        .select({ organizationId: services.organizationId, value: count() })
        .from(services)
        .where(and(inArray(services.organizationId, organizationIds), isNull(services.deletedAt)))
        .groupBy(services.organizationId),
      this.db
        .select({ organizationId: clients.organizationId, value: count() })
        .from(clients)
        .where(and(inArray(clients.organizationId, organizationIds), isNull(clients.deletedAt)))
        .groupBy(clients.organizationId),
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

    const result = new Map<
      string,
      {
        servicesCount: number;
        clientsCount: number;
        bookingsCount: number;
        lastBookingAt: Date | null;
      }
    >();

    for (const organizationId of organizationIds) {
      result.set(organizationId, {
        servicesCount: serviceRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        clientsCount: clientRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        bookingsCount: bookingRows.find((row) => row.organizationId === organizationId)?.value ?? 0,
        lastBookingAt:
          bookingRows.find((row) => row.organizationId === organizationId)?.lastCreatedAt ?? null,
      });
    }

    return result;
  }
}
