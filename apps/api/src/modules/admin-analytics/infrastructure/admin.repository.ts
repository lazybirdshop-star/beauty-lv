import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq, gte } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { inviteCodes } from '../../../shared/database/schema/invite-codes';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users, type UserRow } from '../../../shared/database/schema/users';

export interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  /** Honest zero: subscriptions table doesn't exist yet (TASKS.md Epic 9, AP-4). */
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

  listInviteCodes() {
    return this.db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
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

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const [[masters], [clients], [orgs], [newRegistrations], [bookingsRow]] = await Promise.all([
      this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'master')),
      this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'client')),
      this.db.select({ value: count() }).from(organizations),
      this.db.select({ value: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
      this.db.select({ value: count() }).from(bookings),
    ]);

    return {
      mastersCount: masters?.value ?? 0,
      clientsCount: clients?.value ?? 0,
      organizationsCount: orgs?.value ?? 0,
      newRegistrationsLast7Days: newRegistrations?.value ?? 0,
      bookingsCount: bookingsRow?.value ?? 0,
      activeSubscriptionsCount: 0,
    };
  }
}
