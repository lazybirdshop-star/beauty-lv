export type AccountStatus = 'active' | 'blocked';
export type SystemRole = 'client' | 'master' | 'platform_admin';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  systemRole: SystemRole;
  accountStatus: AccountStatus;
}
