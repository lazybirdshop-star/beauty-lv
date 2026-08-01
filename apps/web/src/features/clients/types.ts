export interface Client {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormValues {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}
