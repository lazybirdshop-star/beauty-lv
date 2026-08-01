import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizations } from '../../../shared/database/schema/organizations';
import {
  subscriptionPlans,
  subscriptions,
  type SubscriptionPlanRow,
  type SubscriptionRow,
} from '../../../shared/database/schema/subscriptions';

export interface AdminSubscriptionRow {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionId: string | null;
  planId: string | null;
  planName: string | null;
  status: SubscriptionRow['status'] | null;
  currentPeriodEnd: Date | null;
}

@Injectable()
export class SubscriptionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listPlans(): Promise<SubscriptionPlanRow[]> {
    return this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.priceAmount));
  }

  async listWithOrganizations(): Promise<AdminSubscriptionRow[]> {
    const rows = await this.db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        subscriptionId: subscriptions.id,
        planId: subscriptions.planId,
        planName: subscriptionPlans.name,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .orderBy(desc(organizations.createdAt));
    return rows;
  }

  /** One subscription per org — creates it on first assignment, otherwise switches the plan and reactivates. */
  async assignPlan(organizationId: string, planId: string): Promise<SubscriptionRow> {
    const [row] = await this.db
      .insert(subscriptions)
      .values({ organizationId, planId, status: 'active' })
      .onConflictDoUpdate({
        target: subscriptions.organizationId,
        set: { planId, status: 'active', updatedAt: new Date() },
      })
      .returning();
    return row!;
  }

  async setStatus(
    subscriptionId: string,
    status: SubscriptionRow['status'],
  ): Promise<SubscriptionRow | null> {
    const [row] = await this.db
      .update(subscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();
    return row ?? null;
  }
}
