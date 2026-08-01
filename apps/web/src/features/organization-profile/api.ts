import { clientApiFetch } from '@/lib/client-api';

import type { OrganizationProfile, ProfileFormValues } from './types';

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
