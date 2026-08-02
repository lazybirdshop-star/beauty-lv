export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  /** Example-of-work photo the master attached to this service. */
  imageUrl: string | null;
  durationMinutes: number;
  priceAmountMinorUnits: number;
  priceCurrency: string;
}

export interface PublicOrganization {
  slug: string;
  name: string;
  tagline: string;
  avatarInitials: string;
  /** Master's own photo, entered as a URL in the profile editor. Absent → monogram. */
  logoUrl?: string;
  city: string;
  address: string;
  phone: string;
  instagram?: string;
  showPricesSection: boolean;
  showContactsSection: boolean;
  /** Appearance chosen by the master — see shared-kernel `THEME_PRESETS`. */
  themePresetKey: string | null;
  fontPresetKey: string | null;
  themeOverrides: Record<string, string> | null;
  heroStyle: string | null;
  backgroundImageUrl: string | null;
  /** Hero banner image, shown when `heroStyle === 'image'`. */
  coverUrl?: string;
  services: PublicService[];
}

export type SlotStatus = 'available' | 'booked';

/**
 * A single window the master explicitly opened for booking. There is no
 * working-hours template and no scheduling algorithm behind this — the
 * master publishes exactly the moments she is free, one at a time, and
 * this is the full list of what she has published (see PRD.md §7.4).
 */
export interface PublishedSlot {
  id: string;
  date: string;
  time: string;
  iso: string;
  status: SlotStatus;
}

export interface DaySlots {
  date: string;
  weekdayShort: string;
  dayNumber: number;
  slots: PublishedSlot[];
}
