import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull, sql } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { services } from '../../../shared/database/schema/services';
import { users } from '../../../shared/database/schema/users';

/**
 * Путь мастера от регистрации до первой записи.
 *
 * Объёмы на главной («мастеров 42») говорят, сколько людей пришло, и молчат
 * о том, сколько из них дошло до работы. Между «завела аккаунт» и «получила
 * первого клиента» четыре шага, и продукт теряет людей на каждом: не завела
 * услуги, не открыла окна, не опубликовала страницу, не получила запись.
 * Видно это только рядом — поэтому одна воронка, а не пять счётчиков в разных
 * местах.
 *
 * Каждый шаг считается по **факту в данных**, а не по флажку «шаг пройден»:
 * флажок расходится с реальностью в тот момент, когда мастер удаляет
 * единственную услугу, которую только что завела.
 */
export interface AdminFunnel {
  masters: number;
  withOrganization: number;
  withServices: number;
  withSlots: number;
  withPublishedPage: number;
  withBooking: number;
  /** Салоны, получившие хотя бы одну запись за последние 30 дней. */
  activeLast30Days: number;
  requests: { pending: number; approved: number; rejected: number };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class FunnelRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async collect(): Promise<AdminFunnel> {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    /**
     * Каждый шаг — «сколько **организаций** дошли до него», а не «сколько
     * строк есть в таблице»: салон с сорока услугами и салон с одной прошли
     * этот шаг одинаково.
     */
    const organizationsWith = (subquery: ReturnType<typeof sql>) =>
      this.db
        .select({ value: count() })
        .from(organizations)
        .where(and(isNull(organizations.deletedAt), subquery));

    const [
      [masters],
      [withOrganization],
      [withServices],
      [withSlots],
      [withPublishedPage],
      [withBooking],
      [activeLast30Days],
      requestRows,
    ] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.systemRole, 'master'), isNull(users.deletedAt))),
      this.db
        .select({ value: sql<number>`count(distinct ${organizationMembers.userId})::int` })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(
          and(
            eq(users.systemRole, 'master'),
            isNull(users.deletedAt),
            isNull(organizations.deletedAt),
          ),
        ),
      organizationsWith(
        sql`exists (select 1 from ${services} where ${services.organizationId} = ${organizations.id} and ${services.deletedAt} is null)`,
      ),
      organizationsWith(
        sql`exists (
          select 1 from ${publishedSlots}
          join ${organizationMembers} on ${organizationMembers.id} = ${publishedSlots.organizationMemberId}
          where ${organizationMembers.organizationId} = ${organizations.id}
        )`,
      ),
      organizationsWith(sql`${organizations.pageDesign} is not null`),
      organizationsWith(
        sql`exists (select 1 from ${bookings} where ${bookings.organizationId} = ${organizations.id} and ${bookings.deletedAt} is null)`,
      ),
      organizationsWith(
        sql`exists (
          select 1 from ${bookings}
          where ${bookings.organizationId} = ${organizations.id}
            and ${bookings.deletedAt} is null
            and ${bookings.createdAt} >= ${since}
        )`,
      ),
      this.db
        .select({ status: registrationRequests.status, value: count() })
        .from(registrationRequests)
        .groupBy(registrationRequests.status),
    ]);

    const requestCount = (status: 'pending' | 'approved' | 'rejected'): number =>
      requestRows.find((row) => row.status === status)?.value ?? 0;

    return {
      masters: masters?.value ?? 0,
      withOrganization: withOrganization?.value ?? 0,
      withServices: withServices?.value ?? 0,
      withSlots: withSlots?.value ?? 0,
      withPublishedPage: withPublishedPage?.value ?? 0,
      withBooking: withBooking?.value ?? 0,
      activeLast30Days: activeLast30Days?.value ?? 0,
      requests: {
        pending: requestCount('pending'),
        approved: requestCount('approved'),
        rejected: requestCount('rejected'),
      },
    };
  }
}
