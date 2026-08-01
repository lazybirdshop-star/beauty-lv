export type SubscriptionStatus = 'active' | 'frozen' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: 'monthly' | 'yearly';
}

export interface AdminSubscriptionRow {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionId: string | null;
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}
