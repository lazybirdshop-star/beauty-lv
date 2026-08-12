import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookings } from '../../../shared/database/schema/bookings';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { services } from '../../../shared/database/schema/services';

/** What the guided setup needs to know about an organization's real state. */
export interface OnboardingFacts {
  organization: OrganizationRow;
  serviceCount: number;
  publishedSlotCount: number;
  bookingCount: number;
}

/**
 * Read-only aggregate across four tables.
 *
 * Reaching into other modules' tables is deliberate and stays one-way: this
 * asks "does a service exist", never "create one". Onboarding owns no data of
 * its own beyond the completion stamp, and the alternative — four services
 * injected to answer four counts — would make a screen's progress bar a
 * cross-module orchestration.
 */
@Injectable()
export class OnboardingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async collectFacts(organizationId: string): Promise<OnboardingFacts | null> {
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) return null;

    const [[serviceRow], [slotRow], [bookingRow]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(services)
        .where(and(eq(services.organizationId, organizationId), isNull(services.deletedAt))),
      /* Windows belong to a member, not to the organization (one master today,
         several in a salon), so the count goes through the membership. */
      this.db
        .select({ value: count() })
        .from(publishedSlots)
        .innerJoin(
          organizationMembers,
          eq(publishedSlots.organizationMemberId, organizationMembers.id),
        )
        .where(eq(organizationMembers.organizationId, organizationId)),
      this.db
        .select({ value: count() })
        .from(bookings)
        .where(eq(bookings.organizationId, organizationId)),
    ]);

    return {
      organization,
      serviceCount: serviceRow?.value ?? 0,
      publishedSlotCount: slotRow?.value ?? 0,
      bookingCount: bookingRow?.value ?? 0,
    };
  }

  async setCompletedAt(organizationId: string, completedAt: Date | null): Promise<void> {
    await this.db
      .update(organizations)
      .set({ onboardingCompletedAt: completedAt, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
  }
}
