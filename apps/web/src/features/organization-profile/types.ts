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
  themePresetKey: string;
  fontPresetKey: string;
  themeOverrides: Record<string, string> | null;
  heroStyle: string;
}

/** Profile tab — content and contacts. */
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

/** Appearance tab — kept separate: different form, different save payload. */
export interface AppearanceFormValues {
  themePresetKey: string;
  fontPresetKey: string;
  heroStyle: string;
  coverUrl: string;
  /** Empty string = "use the preset's colour". */
  overrideBg: string;
  overrideBgRaised: string;
  overrideInk: string;
  overrideAccent: string;
}
