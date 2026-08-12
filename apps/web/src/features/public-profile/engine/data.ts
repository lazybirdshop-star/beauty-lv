import { pageDesignFromLegacy, sanitizePageDesign, type PageDesign } from '@amolie/shared-kernel';
import { permanentRedirect } from 'next/navigation';
import { cache } from 'react';

import { ApiError, errorField } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';

import type {
  PublicOrganization,
  PublicService,
  PublicServiceCategory,
  PublishedSlot,
  ServiceAddonPair,
  SlotStatus,
} from './types';

interface ApiOrganization {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  publicDisplayName: string | null;
  defaultLocale: string | null;
  showAvatar: boolean;
  designPresetKey: string | null;
  themePresetKey: string | null;
  fontPresetKey: string | null;
  themeOverrides: Record<string, string> | null;
  heroStyle: string | null;
  backgroundImageUrl: string | null;
  /** Опубликованные решения Студии; `null` у страницы, ещё не переехавшей. */
  pageDesign: PageDesign | null;
  contactPhone: string | null;
  addressLine: string | null;
  city: string | null;
  instagramHandle: string | null;
  showPricesSection: boolean;
  showContactsSection: boolean;
}

interface ApiServiceCategory {
  id: string;
  name: string;
}

interface ApiService {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  priceAmount: number;
  priceCurrency: string;
}

interface ApiPublishedSlot {
  id: string;
  startsAt: string;
  status: SlotStatus;
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]!.toUpperCase());
  return initials.join('') || '?';
}

function toPublicOrganization(
  org: ApiOrganization,
  services: ApiService[],
  categories: ApiServiceCategory[],
  addons: ServiceAddonPair[],
): PublicOrganization {
  return {
    slug: org.slug,
    // The master's own label wins; the registration name is the fallback.
    name: org.publicDisplayName?.trim() || org.name,
    tagline: org.description ?? '',
    avatarInitials: avatarInitials(org.name),
    defaultLocale: org.defaultLocale,
    /* Опубликованные решения мастера, если она уже была в Студии; иначе —
       прежние поля, прочитанные как решения (§7.5). Разбор недоверенного
       входа один и тот же на сервере и здесь: страница обязана выдержать
       строку из базы так же, как сервер выдерживает строку из запроса. */
    design: org.pageDesign
      ? sanitizePageDesign(org.pageDesign)
      : pageDesignFromLegacy({
          designPresetKey: org.designPresetKey,
          themePresetKey: org.themePresetKey,
          fontPresetKey: org.fontPresetKey,
          themeOverrides: org.themeOverrides,
          heroStyle: org.heroStyle,
          coverUrl: org.coverUrl,
          logoUrl: org.logoUrl,
          backgroundImageUrl: org.backgroundImageUrl,
          showAvatar: org.showAvatar,
        }),
    city: org.city ?? '',
    address: org.addressLine ?? '',
    phone: org.contactPhone ?? '',
    instagram: org.instagramHandle ?? undefined,
    showPricesSection: org.showPricesSection,
    showContactsSection: org.showContactsSection,
    serviceAddons: addons,
    serviceCategories: categories.map((category): PublicServiceCategory => ({
      id: category.id,
      name: category.name,
    })),
    services: services.map((service): PublicService => ({
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl,
      durationMinutes: service.durationMinutes,
      priceAmountMinorUnits: service.priceAmount,
      priceCurrency: service.priceCurrency,
    })),
  };
}

/** Stand-in shape matches API.md §6.1–6.2 exactly — see the dashboard-architecture plan for why this used to be mock data. */
export const getOrganizationBySlug = cache(
  async (slug: string): Promise<PublicOrganization | null> => {
    try {
      const [org, services, categories, addons] = await Promise.all([
        serverApiFetch<ApiOrganization>(`/organizations/${slug}`),
        serverApiFetch<ApiService[]>(`/organizations/${slug}/public-services`),
        serverApiFetch<ApiServiceCategory[]>(`/organizations/${slug}/public-service-categories`),
        serverApiFetch<ServiceAddonPair[]>(`/organizations/${slug}/public-service-addons`),
      ]);
      return toPublicOrganization(org, services, categories, addons);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        /* The master may have moved: a 404 carrying `movedTo` means this
           address used to be hers and now redirects to the current one. Her
           clients hold the old link in a browser's history and in messages
           sent months ago, and answering them with «нет такого мастера» is
           losing a client to a rename.

           308 rather than 302: the move is permanent, and search engines
           should transfer the page's standing to the new address. Landing on
           her main page rather than the same sub-path is deliberate — this
           helper does not know which route asked, and the front page is
           always a correct place to arrive. */
        const movedTo = errorField(error, 'movedTo');
        if (movedTo) permanentRedirect(`/${movedTo}`);
        return null;
      }
      throw error;
    }
  },
);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toPublishedSlot(slot: ApiPublishedSlot): PublishedSlot {
  const date = new Date(slot.startsAt);
  return {
    id: slot.id,
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    iso: slot.startsAt,
    status: slot.status,
  };
}

/** API.md §6.3 — public, available-only windows. */
export const getPublishedSlots = cache(async (slug: string): Promise<PublishedSlot[]> => {
  const slots = await serverApiFetch<ApiPublishedSlot[]>(
    `/organizations/${slug}/public-availability`,
  );
  return slots.map(toPublishedSlot);
});
