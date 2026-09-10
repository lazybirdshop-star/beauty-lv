export type SubscriptionStatus = 'active' | 'frozen' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceAmount: number;
  /** Сколько участников разрешает тариф; `null` — без ограничения. */
  memberLimit: number | null;
  priceCurrency: string;
  billingInterval: 'monthly' | 'yearly';
  /** `false` — тариф в архиве: не предлагается новым, остаётся у прежних. */
  isActive?: boolean;
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
  /* Три поля ниже пришли с таблицей из артборда и приходят не от всякого
     API: веб и API выкатываются раздельно. */
  startedAt?: string | null;
  billingInterval?: 'monthly' | 'yearly' | null;
  organizationType?: 'solo' | 'salon';
}

/** Отборы таблицы подписок — те же значения, что принимает API. */
export type SubscriptionStateFilter = 'all' | SubscriptionStatus | 'none';
export type RenewsFilter = 'all' | 'soon' | 'passed';

export interface AdminSubscriptionsFilters extends Record<string, string | number | undefined> {
  state?: Exclude<SubscriptionStateFilter, 'all'>;
  planId?: string;
  renews?: Exclude<RenewsFilter, 'all'>;
}
