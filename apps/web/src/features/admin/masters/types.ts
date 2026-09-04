import type { AccountStatus } from '../shared/types';

export type { AccountStatus };

export interface AdminMaster {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  accountStatus: AccountStatus;
  createdAt: string;
  /** Адрес публичной страницы. `null` — мастер зарегистрировалась и салона ещё нет. */
  organizationSlug: string | null;
  organizationName: string | null;
  /*
   * Четыре поля ниже пришли вместе с таблицей из артборда и приходят не от
   * всякого API: веб и API выкатываются раздельно. Пока сервер старый, колонки
   * показывают прочерк, а не ломают экран.
   */
  pagePublished?: boolean;
  bookingsCount?: number;
  planName?: string | null;
  subscriptionStatus?: 'active' | 'frozen' | 'cancelled' | null;
}

/** Отборы таблицы мастеров — те же значения, что принимает API. */
export type MasterPageFilter = 'all' | 'published' | 'unpublished';
export type MasterSubscriptionFilter = 'all' | 'active' | 'frozen' | 'cancelled' | 'none';
export type MasterCreatedFilter = 'all' | '7' | '30' | '90';

export interface AdminMastersFilters extends Record<string, string | number | undefined> {
  status?: AccountStatus;
  page?: Exclude<MasterPageFilter, 'all'>;
  subscription?: Exclude<MasterSubscriptionFilter, 'all'>;
  createdWithinDays?: number;
}

/** Салон мастера глазами платформы — только то, по чему решают в поддержке. */
export interface AdminMasterOrganization {
  id: string;
  name: string;
  slug: string;
  type: 'solo' | 'salon';
  status: 'active' | 'suspended' | 'archived';
  role: string;
  createdAt: string;
  onboardingCompletedAt: string | null;
  pagePublished: boolean;
  servicesCount: number;
  clientsCount: number;
  bookingsCount: number;
  lastBookingAt: string | null;
  planName: string | null;
  subscriptionStatus: 'active' | 'frozen' | 'cancelled' | null;
  currentPeriodEnd: string | null;
}

export interface AdminMasterActivity {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actorName: string | null;
  /** Заполнено, только если за столом этого человека сидела поддержка. */
  impersonatedByName: string | null;
}

export interface AdminMasterDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  locale: string;
  systemRole: 'client' | 'master' | 'platform_admin';
  accountStatus: AccountStatus;
  createdAt: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  organizations: AdminMasterOrganization[];
  /** Журнал действий именно по этому аккаунту — часть карточки, не раздел. */
  activity: AdminMasterActivity[];
}
