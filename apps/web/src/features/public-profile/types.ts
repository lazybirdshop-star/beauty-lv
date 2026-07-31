export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmountMinorUnits: number;
  priceCurrency: string;
}

export interface WorkingHoursEntry {
  /** 0 = Sunday ... 6 = Saturday, matching Date#getDay(). */
  weekday: number;
  start: string;
  end: string;
}

export interface PublicOrganization {
  slug: string;
  name: string;
  tagline: string;
  avatarInitials: string;
  city: string;
  address: string;
  phone: string;
  instagram?: string;
  timezone: string;
  workingHours: WorkingHoursEntry[];
  services: PublicService[];
}

export interface TimeSlot {
  time: string;
  iso: string;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  weekdayShort: string;
  dayNumber: number;
  isOpen: boolean;
  slots: TimeSlot[];
}
