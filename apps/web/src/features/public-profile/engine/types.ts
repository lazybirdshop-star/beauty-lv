import type { PageDesign } from '@amolie/shared-kernel';

export interface PublicServiceCategory {
  id: string;
  name: string;
}

/** "Booking X? — the master also suggests Y." Directed: X→Y does not imply Y→X. */
export interface ServiceAddonPair {
  serviceId: string;
  addonServiceId: string;
}

export interface PublicService {
  id: string;
  /** `null` when the master has no categories, or this service sits outside them. */
  categoryId: string | null;
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
  city: string;
  address: string;
  phone: string;
  instagram?: string;
  showPricesSection: boolean;
  showContactsSection: boolean;
  /** Language the page renders in — the master's choice, not the visitor's browser. */
  defaultLocale: string | null;
  /**
   * Облик страницы — решения мастера по ручкам Студии
   * (DESIGN_STUDIO.md §5), а не готовые значения токенов.
   *
   * Одно поле вместо восьми: пока стиль, палитра, шрифт, обложка и ручные
   * цвета лежали порознь, каждый потребитель собирал их заново и собирал
   * по-своему. Страница, миниатюра каталога и холст Студии читают отсюда, а
   * значения выводит `resolvePageDesignTokens` — единственный резолвер.
   * Страница, не переехавшая в Студию, приходит сюда через
   * `pageDesignFromLegacy` и выглядит ровно как раньше (§7.5).
   */
  design: PageDesign;
  services: PublicService[];
  /** Visible categories in the master's order; empty means "no grouping". */
  serviceCategories: PublicServiceCategory[];
  serviceAddons: ServiceAddonPair[];
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

/**
 * One bookable day inside the booking sheet's time step: the date plus its
 * short localized label («10 февр.») and the windows that fit the visit.
 * Lived as three identical copies (both `booking-steps.tsx` and both sheets'
 * local `groupByDay`); one definition now, the scenes keep consuming it.
 */
export interface SlotDay {
  date: string;
  label: string;
  slots: PublishedSlot[];
}
