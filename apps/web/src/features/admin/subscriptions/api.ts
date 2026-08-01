import { clientApiFetch } from '@/lib/client-api';

import type { AdminSubscriptionRow, SubscriptionPlan, SubscriptionStatus } from './types';

export function listPlans(): Promise<SubscriptionPlan[]> {
  return clientApiFetch<SubscriptionPlan[]>('/admin/subscription-plans');
}

export function listSubscriptions(): Promise<AdminSubscriptionRow[]> {
  return clientApiFetch<AdminSubscriptionRow[]>('/admin/subscriptions');
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
