import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq, gte } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { inviteCodes } from '../../../shared/database/schema/invite-codes';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';

export interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  /** Honest zeros: bookings/subscriptions tables don't exist yet (see the dashboard-architecture plan, Modules 4b/9). */
  bookingsCount: number;
  activeSubscriptionsCount: number;
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

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const [[masters], [clients], [orgs], [newRegistrations]] = await Promise.all([
      this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'master')),
      this.db.select({ value: count() }).from(users).where(eq(users.systemRole, 'client')),
      this.db.select({ value: count() }).from(organizations),
      this.db.select({ value: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
    ]);

    return {
      mastersCount: masters?.value ?? 0,
      clientsCount: clients?.value ?? 0,
      organizationsCount: orgs?.value ?? 0,
      newRegistrationsLast7Days: newRegistrations?.value ?? 0,
      bookingsCount: 0,
      activeSubscriptionsCount: 0,
    };
  }
}
