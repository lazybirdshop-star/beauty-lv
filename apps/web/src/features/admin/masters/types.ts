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
