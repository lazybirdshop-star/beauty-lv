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
