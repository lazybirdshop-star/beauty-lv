export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  type: 'solo' | 'salon';
  status: OrganizationStatus;
  createdAt: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  pagePublished: boolean;
  mastersCount: number;
  bookingsCount: number;
  /* Приходит не от всякого API: веб и API выкатываются раздельно, и до
     выката сервера колонка «Записи · 30 дней» показывает прочерк. */
  bookings30dCount?: number;
  lastBookingAt: string | null;
  planName: string | null;
  subscriptionStatus: 'active' | 'frozen' | 'cancelled' | null;
}

/** Отборы таблицы салонов — те же значения, что принимает API. */
export type TeamSizeFilter = 'all' | 'solo' | 'small' | 'large';
export type OrgSubscriptionFilter = 'all' | 'active' | 'frozen' | 'cancelled' | 'none';

export interface AdminOrganizationsFilters extends Record<string, string | number | undefined> {
  status?: OrganizationStatus;
  teamSize?: Exclude<TeamSizeFilter, 'all'>;
  subscription?: Exclude<OrgSubscriptionFilter, 'all'>;
}
