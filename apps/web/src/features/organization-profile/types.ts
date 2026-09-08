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
  /* Как показан прайс — вкладка «Предпросмотр» раздела услуг. Поля
     необязательные: веб и API выкатываются раздельно. */
  showServiceDurations?: boolean;
  groupServicesByCategory?: boolean;
  showContactsSection: boolean;
  autoConfirmBookings: boolean;
  /** За сколько часов до визита клиент может отменить его сам; null — не может. */
  clientCancellationHours: number | null;
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
  /*
   * Поля вкладки «Предпросмотр» раздела услуг: форма профиля их не показывает,
   * а `updateProfile` принимает `Partial` — экран отправляет только то, что
   * сам и показал.
   */
  showServiceDurations?: boolean;
  groupServicesByCategory?: boolean;
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
