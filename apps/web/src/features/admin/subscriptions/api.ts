import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';
import type {
  AdminSubscriptionRow,
  AdminSubscriptionsFilters,
  SubscriptionPlan,
  SubscriptionStatus,
} from './types';

export function listPlans(): Promise<SubscriptionPlan[]> {
  return clientApiFetch<SubscriptionPlan[]>('/admin/subscription-plans');
}

/** Вместе с архивными — иначе тариф из архива не вернуть. */
export function listAllPlans(): Promise<SubscriptionPlan[]> {
  return clientApiFetch<SubscriptionPlan[]>('/admin/subscription-plans/all');
}

export interface PlanInput {
  name: string;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: 'monthly' | 'yearly';
}

export function createPlan(input: PlanInput): Promise<SubscriptionPlan> {
  return clientApiFetch<SubscriptionPlan>('/admin/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updatePlan(
  planId: string,
  input: Partial<PlanInput> & { isActive?: boolean },
): Promise<SubscriptionPlan> {
  return clientApiFetch<SubscriptionPlan>(`/admin/subscription-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * Страница подписок вместе с четырьмя числами над таблицей. Числа считают всю
 * платформу, а не отбор. Поле необязательное — старый API его не присылает.
 */
export interface AdminSubscriptionsPage extends AdminListPage<AdminSubscriptionRow> {
  states?: { active: number; frozen: number; cancelled: number; none: number };
}

export function listSubscriptions(
  params: AdminSubscriptionsFilters & { query?: string; limit: number; offset: number },
): Promise<AdminSubscriptionsPage> {
  return clientApiFetch<AdminSubscriptionsPage>(`/admin/subscriptions?${toSearchParams(params)}`);
}

export function assignPlan(organizationId: string, planId: string): Promise<unknown> {
  return clientApiFetch('/admin/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ organizationId, planId }),
  });
}

export function setSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
): Promise<unknown> {
  return clientApiFetch(`/admin/subscriptions/${subscriptionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
