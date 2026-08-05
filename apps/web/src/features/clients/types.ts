/** Private marker the master puts on a client. Never leaves the dashboard. */
export type ClientFlag = 'attention' | 'favourite' | null;

export interface Client {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  instagramHandle: string | null;
  notes: string | null;
  flag: ClientFlag;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormValues {
  flag: string | null;
  fullName: string;
  phone: string;
  email: string;
  instagramHandle: string;
  notes: string;
}
