export interface OrganizationProfile {
  defaultLocale: string | null;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  publicDisplayName: string | null;
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
  showAvatar: boolean;
  designPresetKey: string;
  themePresetKey: string;
  fontPresetKey: string;
  themeOverrides: Record<string, string> | null;
  heroStyle: string;
  backgroundImageUrl: string | null;
}

/** Profile tab — content and contacts. */
export interface ProfileFormValues {
  defaultLocale: string;
  publicDisplayName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  instagramHandle: string;
  showPricesSection: boolean;
  showContactsSection: boolean;
}

/** Appearance tab — kept separate: different form, different save payload. */
export interface AppearanceFormValues {
  logoUrl: string;
  showAvatar: boolean;
  designPresetKey: string;
  themePresetKey: string;
  fontPresetKey: string;
  heroStyle: string;
  coverUrl: string;
  /** Empty string = "use the preset's colour". */
  overrideBg: string;
  overrideBgRaised: string;
  overrideInk: string;
  overrideAccent: string;
  backgroundImageUrl: string;
}
