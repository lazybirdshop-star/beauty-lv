import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';

export interface DashboardSummary {
  todaysBookingsCount: number;
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: { message: string; at: string }[];
}

@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The first organization this user is a member of (see ARCHITECTURE.md §3.6 on multi-org UX). */
  async findMineForUser(userId: string): Promise<(OrganizationRow & { role: string }) | null> {
    const [row] = await this.db
      .select({ organization: organizations, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    return row ? { ...row.organization, role: row.role } : null;
  }

  /**
   * Honest zeros: `bookings`/`clients` tables don't exist yet (dashboard-
   * architecture plan, Modules 2-4b). Structure is real, data isn't.
   */
  getDashboardSummary(): DashboardSummary {
    return {
      todaysBookingsCount: 0,
      upcomingBookingsCount: 0,
      clientsCount: 0,
      revenue: { amountMinorUnits: 0, currency: 'EUR' },
      recentActivity: [],
    };
  }
}
