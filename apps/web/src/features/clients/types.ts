export interface Client {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  instagramHandle: string | null;
  notes: string | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormValues {
  fullName: string;
  phone: string;
  email: string;
  instagramHandle: string;
  notes: string;
}
