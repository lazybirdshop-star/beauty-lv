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
  lastBookingAt: string | null;
  planName: string | null;
  subscriptionStatus: 'active' | 'frozen' | 'cancelled' | null;
}
