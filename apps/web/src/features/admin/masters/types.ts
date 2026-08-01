export type AccountStatus = 'active' | 'blocked';

export interface AdminMaster {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  accountStatus: AccountStatus;
  createdAt: string;
  organizationSlug: string | null;
  organizationName: string | null;
}
