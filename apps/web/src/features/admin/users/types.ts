import type { AccountStatus, SystemRole } from '../shared/types';

export type { AccountStatus, SystemRole };

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  systemRole: SystemRole;
  accountStatus: AccountStatus;
}
