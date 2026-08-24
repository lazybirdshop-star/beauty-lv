export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AdminRegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  locale: string;
  message: string | null;
  status: RegistrationRequestStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
  rejectionReason: string | null;
  createdUserId: string | null;
  /** Адрес заведённой страницы — по нему видно, что вышло из одобрения. */
  createdOrganizationSlug: string | null;
}
