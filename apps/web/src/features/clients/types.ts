export interface Client {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  instagramHandle: string | null;
  notes: string | null;
  /** Private marker: 'attention' | 'favourite' | null. */
  flag: string | null;
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
