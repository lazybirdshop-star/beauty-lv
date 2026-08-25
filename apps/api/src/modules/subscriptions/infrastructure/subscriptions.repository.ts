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

  /**
   * Тарифы для **выбора**: только действующие.
   *
   * Архивный тариф остаётся у тех, кому он уже назначен, — архив прячет его
   * из выбора, а не отнимает у салонов. Поэтому у списка два вида, и путать
   * их нельзя: назначить снятый с продажи тариф новому салону было бы
   * ошибкой, а показать его в карточке старого — обязанностью.
   */
  listPlans(): Promise<SubscriptionPlanRow[]> {
    return this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.priceAmount));
  }

  /** Тарифы для **управления**: вместе с архивными, иначе их не вернуть. */
  listAllPlans(): Promise<SubscriptionPlanRow[]> {
    return this.db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.priceAmount));
  }

  async createPlan(input: {
    name: string;
    priceAmount: number;
    priceCurrency: string;
    billingInterval: SubscriptionPlanRow['billingInterval'];
  }): Promise<SubscriptionPlanRow> {
    const [row] = await this.db.insert(subscriptionPlans).values(input).returning();
    return row!;
  }

  /**
   * Правка тарифа меняет **условие продажи**, а не цену уже назначенных
   * подписок: цена лежит в самом тарифе, поэтому смена суммы касается всех,
   * кому он назначен. Это осознанно — биллинга нет, и подписка здесь означает
   * «на каких условиях договорились», а не выставленный счёт. Когда появится
   * оплата, цену придётся снимать снимком в подписку, как это сделано с
   * ценами услуг в позициях записи.
   */
  async updatePlan(
    planId: string,
    input: Partial<{
      name: string;
      priceAmount: number;
      priceCurrency: string;
      billingInterval: SubscriptionPlanRow['billingInterval'];
      isActive: boolean;
    }>,
  ): Promise<SubscriptionPlanRow | null> {
    const [row] = await this.db
      .update(subscriptionPlans)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId))
      .returning();
    return row ?? null;
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
