import { clientApiFetch } from '@/lib/client-api';

import type { AppearanceFormValues, OrganizationProfile, ProfileFormValues } from './types';

export function getMyOrganization(): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>('/organizations/me');
}

/** Empty strings become `undefined` so optional-field validators (IsUrl/IsEmail) don't reject a cleared field. */
function toPayload(values: Partial<ProfileFormValues>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}

/**
 * `Partial` on purpose: the page-settings form sends everything it showed,
 * while onboarding's first-profile step sends only the four fields it asked
 * about. A PATCH that carries fields the screen never displayed is a way to
 * overwrite them by accident.
 */
export function updateProfile(
  slug: string,
  values: Partial<ProfileFormValues>,
): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>(`/organizations/${slug}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(values)),
  });
}

/**
 * One field, not the whole page form. The bookings screen has no business
 * re-submitting a description and a set of contacts it never showed — a PATCH
 * that carries fields nobody edited is a way to overwrite them by accident.
 */
export function updateBookingAcceptance(
  slug: string,
  autoConfirmBookings: boolean,
): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>(`/organizations/${slug}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ autoConfirmBookings }),
  });
}

/** То же правило «одно поле, а не вся форма», что и у приёма записей. */
export function updateCancellationPolicy(
  slug: string,
  clientCancellationHours: number | null,
): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>(`/organizations/${slug}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ clientCancellationHours }),
  });
}

export function updateAppearance(
  slug: string,
  values: AppearanceFormValues,
): Promise<OrganizationProfile> {
  const overrides: Record<string, string> = {};
  if (values.overrideBg) overrides.bg = values.overrideBg;
  if (values.overrideBgRaised) overrides.bgRaised = values.overrideBgRaised;
  if (values.overrideInk) overrides.ink = values.overrideInk;
  if (values.overrideAccent) overrides.accent = values.overrideAccent;

  return clientApiFetch<OrganizationProfile>(`/organizations/${slug}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({
      logoUrl: values.logoUrl.trim() || null,
      showAvatar: values.showAvatar,
      designPresetKey: values.designPresetKey,
      themePresetKey: values.themePresetKey,
      fontPresetKey: values.fontPresetKey,
      heroStyle: values.heroStyle,
      coverUrl: values.coverUrl.trim() || undefined,
      backgroundImageUrl: values.backgroundImageUrl.trim() || null,
      // An empty object clears every override back to the preset.
      themeOverrides: overrides,
    }),
  });
}
