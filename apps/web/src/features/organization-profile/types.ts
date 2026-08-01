export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  city: string | null;
  instagramHandle: string | null;
  showPricesSection: boolean;
  showContactsSection: boolean;
  autoConfirmBookings: boolean;
}

export interface ProfileFormValues {
  description: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  instagramHandle: string;
  showPricesSection: boolean;
  showContactsSection: boolean;
  autoConfirmBookings: boolean;
}
