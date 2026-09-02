import {
  pageDesignFromLegacy,
  sanitizePageDesign,
  type MediaDecision,
  type PageDesign,
} from '@amolie/shared-kernel';
import { unstable_cache } from 'next/cache';
import { permanentRedirect } from 'next/navigation';
import { cache } from 'react';

import { ApiError, errorField } from '@/lib/api-error';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { dayKey, timeKey } from '@/lib/format';
import { publicApiFetch, serverApiFetch } from '@/lib/server-api';

import { PUBLIC_PROFILE_REVALIDATE_SECONDS, publicProfileTag } from './public-profile-cache';

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
  /** Портрет владельца — приходит из его строки участника, а не из организации. */
  masterAvatar: MediaDecision | null;
  contactPhone: string | null;
  addressLine: string | null;
  city: string | null;
  instagramHandle: string | null;
  showPricesSection: boolean;
  showContactsSection: boolean;
  /** Пояс салона; у старых ответов его может не быть — тогда умолчание колонки. */
  timezone: string | null;
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
    timeZone: org.timezone?.trim() || FALLBACK_TIMEZONE,
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
          backgroundImageUrl: org.backgroundImageUrl,
          showAvatar: org.showAvatar,
        }),
    masterAvatar: org.masterAvatar,
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

/**
 * Витрина мастера, какой её видит посетитель, — из кэша.
 *
 * Кто она, что делает, по чём и какими группами — четыре ответа, которые
 * меняются раз в недели, а спрашивались у API на каждое открытие страницы.
 * Это самый посещаемый экран продукта, он же Mobile First, и до первого байта
 * посетитель ждал перелёта до Fly, которого могло не быть вовсе.
 *
 * Кэшируется именно эта четвёрка и только она. Доступность окон (ниже)
 * остаётся живой: час, проданный минуту назад, обязан пропасть из списка
 * немедленно, иначе двое запишутся на одно время.
 *
 * `unstable_cache`, а не `'use cache'`: последнее — направление Next 16, но
 * оно требует `cacheComponents` на весь проект, то есть статики по умолчанию
 * и границ Suspense на каждом динамическом чтении. Это отдельный переход со
 * своей проверкой всех экранов, а не побочный эффект правки скорости.
 *
 * Обёртка создаётся на каждый вызов, потому что метка обязана быть своей у
 * каждого мастера: одна общая гасила бы витрины всех сразу при публикации
 * любой из них.
 */
function fetchPublicOrganization(slug: string): Promise<PublicOrganization | null> {
  return unstable_cache(
    async () => {
      const [org, services, categories, addons] = await Promise.all([
        publicApiFetch<ApiOrganization>(`/organizations/${slug}`),
        publicApiFetch<ApiService[]>(`/organizations/${slug}/public-services`),
        publicApiFetch<ApiServiceCategory[]>(`/organizations/${slug}/public-service-categories`),
        publicApiFetch<ServiceAddonPair[]>(`/organizations/${slug}/public-service-addons`),
      ]);
      return toPublicOrganization(org, services, categories, addons);
    },
    ['public-organization', slug],
    { tags: [publicProfileTag(slug)], revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS },
  )();
}

/** Stand-in shape matches API.md §6.1–6.2 exactly — see the dashboard-architecture plan for why this used to be mock data. */
export const getOrganizationBySlug = cache(
  async (slug: string): Promise<PublicOrganization | null> => {
    try {
      return await fetchPublicOrganization(slug);
    } catch (error) {
      /* Разбор ошибки — снаружи кэша, и это не мелочь: `permanentRedirect`
         работает броском, а бросок внутри кэшируемой функции пришлось бы либо
         запоминать, либо повторять на каждом промахе. Переезд мастера
         случается раз в жизни страницы и кэша не заслуживает. */
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

/**
 * Момент окна — в дату и час салона.
 *
 * `dayKey`/`timeKey` с поясом, а не `getFullYear()`/`getHours()`: последние
 * говорят поясом машины, а этот код выполняет сервер. Отрисованная им
 * страница показывала часы по UTC, и окно, открытое мастером на 14:00,
 * приезжало клиенту как «11:00» — одинаково неверно во всех странах сразу.
 */
function toPublishedSlot(slot: ApiPublishedSlot, timeZone: string): PublishedSlot {
  return {
    id: slot.id,
    date: dayKey(slot.startsAt, timeZone),
    time: timeKey(slot.startsAt, timeZone),
    iso: slot.startsAt,
    status: slot.status,
  };
}

/**
 * API.md §6.3 — public, available-only windows.
 *
 * Пояс приходит аргументом, а не читается вторым запросом за профилем:
 * маршрут уже держит организацию в руках, а `cache()` вокруг делает ключом
 * оба аргумента — молчаливое умолчание здесь разошлось бы с пропущенным
 * поясом на первом же вызове.
 */
export const getPublishedSlots = cache(
  async (slug: string, timeZone: string): Promise<PublishedSlot[]> => {
    const slots = await serverApiFetch<ApiPublishedSlot[]>(
      `/organizations/${slug}/public-availability`,
    );
    return slots.map((slot) => toPublishedSlot(slot, timeZone));
  },
);
