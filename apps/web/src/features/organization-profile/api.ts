import { clientApiFetch } from '@/lib/client-api';

import type { AppearanceFormValues, OrganizationProfile, ProfileFormValues } from './types';

export function getMyOrganization(): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>('/organizations/me');
}

/** Empty strings become `undefined` so optional-field validators (IsUrl/IsEmail) don't reject a cleared field. */
function toPayload(values: ProfileFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}

export function updateProfile(
  slug: string,
  values: ProfileFormValues,
): Promise<OrganizationProfile> {
  return clientApiFetch<OrganizationProfile>(`/organizations/${slug}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(values)),
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
