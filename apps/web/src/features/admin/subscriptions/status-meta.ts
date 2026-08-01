import type { SubscriptionStatus } from './types';

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  active: { label: 'Активна', tone: 'success' },
  frozen: { label: 'Заморожена', tone: 'warning' },
  cancelled: { label: 'Отменена', tone: 'danger' },
};
