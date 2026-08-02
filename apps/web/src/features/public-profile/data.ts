import { cache } from 'react';

import { ApiError } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';

import type { PublicOrganization, PublicService, PublishedSlot, SlotStatus } from './types';

interface ApiOrganization {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  themePresetKey: string | null;
  fontPresetKey: string | null;
  themeOverrides: Record<string, string> | null;
  heroStyle: string | null;
  backgroundImageUrl: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  city: string | null;
  instagramHandle: string | null;
  showPricesSection: boolean;
  showContactsSection: boolean;
}

interface ApiService {
  id: string;
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

function toPublicOrganization(org: ApiOrganization, services: ApiService[]): PublicOrganization {
  return {
    slug: org.slug,
    name: org.name,
    tagline: org.description ?? '',
    avatarInitials: avatarInitials(org.name),
    logoUrl: org.logoUrl ?? undefined,
    coverUrl: org.coverUrl ?? undefined,
    themePresetKey: org.themePresetKey,
    fontPresetKey: org.fontPresetKey,
    themeOverrides: org.themeOverrides,
    heroStyle: org.heroStyle,
    backgroundImageUrl: org.backgroundImageUrl,
    city: org.city ?? '',
    address: org.addressLine ?? '',
    phone: org.contactPhone ?? '',
    instagram: org.instagramHandle ?? undefined,
    showPricesSection: org.showPricesSection,
    showContactsSection: org.showContactsSection,
    services: services.map((service): PublicService => ({
      id: service.id,
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
      const [org, services] = await Promise.all([
        serverApiFetch<ApiOrganization>(`/organizations/${slug}`),
        serverApiFetch<ApiService[]>(`/organizations/${slug}/public-services`),
      ]);
      return toPublicOrganization(org, services);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
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
