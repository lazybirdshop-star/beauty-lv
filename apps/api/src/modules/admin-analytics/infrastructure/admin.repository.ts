import { Inject, Injectable } from '@nestjs/common';
import { generateInviteCode } from '@amolie/shared-kernel';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { alias, type PgColumn } from 'drizzle-orm/pg-core';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { inviteCodes, type InviteCodeRow } from '../../../shared/database/schema/invite-codes';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { subscriptions } from '../../../shared/database/schema/subscriptions';
import { users, type UserRow } from '../../../shared/database/schema/users';

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

export interface WeeklyPoint {
  /** Monday of the ISO week, `YYYY-MM-DD`. */
  week: string;
  value: number;
}

export interface AdminWeeklyTrends {
  registrations: WeeklyPoint[];
  bookings: WeeklyPoint[];
}

export interface AdminInviteCodeRow {
  id: string;
  code: string;
  status: InviteCodeRow['status'];
  intendedForName: string | null;
  intendedForContact: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
  issuedByName: string | null;
  usedByName: string | null;
  organizationSlug: string | null;
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

  listOrganizations() {
    return this.db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  /** Joined twice on `users` — issuer and redeemer are different people. */
  listInviteCodes(): Promise<AdminInviteCodeRow[]> {
    const issuer = alias(users, 'issuer');
    const redeemer = alias(users, 'redeemer');

    return this.db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        status: inviteCodes.status,
        intendedForName: inviteCodes.intendedForName,
        intendedForContact: inviteCodes.intendedForContact,
        expiresAt: inviteCodes.expiresAt,
        usedAt: inviteCodes.usedAt,
        createdAt: inviteCodes.createdAt,
        issuedByName: issuer.fullName,
        usedByName: redeemer.fullName,
        organizationSlug: organizations.slug,
      })
      .from(inviteCodes)
      .leftJoin(issuer, eq(issuer.id, inviteCodes.issuedByUserId))
      .leftJoin(redeemer, eq(redeemer.id, inviteCodes.usedByUserId))
      .leftJoin(organizations, eq(organizations.id, inviteCodes.createdOrganizationId))
      .orderBy(desc(inviteCodes.createdAt));
  }

  async createInviteCode(input: {
    issuedByUserId: string;
    intendedForName?: string;
    intendedForContact?: string;
    expiresAt?: Date;
  }): Promise<InviteCodeRow> {
    // Collisions are vanishingly unlikely (31^8), but `code` is unique and a
    // duplicate would surface as a 500 — retry a few times instead.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const [row] = await this.db
          .insert(inviteCodes)
          .values({ ...input, code: generateInviteCode() })
          .returning();
        return row!;
      } catch (error) {
        const isUnique =
          typeof error === 'object' &&
          error !== null &&
          (error as { code?: string }).code === '23505';
        if (!isUnique) throw error;
      }
    }
    throw new Error('Не удалось сгенерировать уникальный код приглашения');
  }

  /** Only an unused code can be revoked — a redeemed one already created an account. */
  async revokeInviteCode(inviteCodeId: string): Promise<InviteCodeRow | null> {
    const [row] = await this.db
      .update(inviteCodes)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(and(eq(inviteCodes.id, inviteCodeId), eq(inviteCodes.status, 'active')))
      .returning();
    return row ?? null;
  }

  async listMasters(): Promise<AdminMasterRow[]> {
    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
        organizationSlug: organizations.slug,
        organizationName: organizations.name,
      })
      .from(users)
      .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .leftJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(users.systemRole, 'master'))
      .orderBy(desc(users.createdAt));
    return rows;
  }

  async setAccountStatus(
    userId: string,
    accountStatus: UserRow['accountStatus'],
  ): Promise<SafeUserSummary | null> {
    const [user] = await this.db
      .update(users)
      .set({ accountStatus, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  listUsers(): Promise<SafeUserSummary[]> {
    return this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async setSystemRole(
    userId: string,
    systemRole: UserRow['systemRole'],
  ): Promise<SafeUserSummary | null> {
    const [user] = await this.db
      .update(users)
      .set({ systemRole, updatedAt: new Date() })
      .where(eq(users.id, userId))
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
        .where(gte(users.createdAt, since))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      this.db
        .select({ week: weekExpr(bookings.createdAt), value: sql<number>`count(*)::int` })
        .from(bookings)
        .where(gte(bookings.createdAt, since))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

    return { registrations, bookings: bookingsPerWeek };
  }

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const [[masters], [clients], [orgs], [newRegistrations], [bookingsRow], [activeSubs]] =
      await Promise.all([
        this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'master')),
        this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'client')),
        this.db.select({ value: count() }).from(organizations),
        this.db.select({ value: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
        this.db.select({ value: count() }).from(bookings),
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
