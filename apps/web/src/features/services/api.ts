import { clientApiFetch } from '@/lib/client-api';

import type { Service, ServiceFormValues } from './types';

/**
 * A cleared photo field must reach the API as `null`, not `''` — an empty
 * string fails the URL validator, and `undefined` would mean "leave as is",
 * making the photo impossible to remove.
 */
function toPayload(values: Partial<ServiceFormValues>) {
  // The chain lives on its own endpoint; sending it here would be rejected
  // by the DTO whitelist and is not what `/services` describes anyway.
  const rest = { ...values };
  delete rest.addonServiceIds;
  if (rest.imageUrl === undefined) return rest;
  return { ...rest, imageUrl: rest.imageUrl.trim() || null };
}

export function listServices(slug: string): Promise<Service[]> {
  return clientApiFetch<Service[]>(`/organizations/${slug}/services`);
}

export function createService(slug: string, values: ServiceFormValues): Promise<Service> {
  return clientApiFetch<Service>(`/organizations/${slug}/services`, {
    method: 'POST',
    body: JSON.stringify(toPayload(values)),
  });
}

export function updateService(
  slug: string,
  serviceId: string,
  values: Partial<ServiceFormValues>,
): Promise<Service> {
  return clientApiFetch<Service>(`/organizations/${slug}/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(values)),
  });
}

export function deleteService(slug: string, serviceId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/services/${serviceId}`, {
    method: 'DELETE',
  });
}

export function listServiceAddons(slug: string, serviceId: string): Promise<string[]> {
  return clientApiFetch<{ addonServiceIds: string[] }>(
    `/organizations/${slug}/services/${serviceId}/addons`,
  ).then((response) => response.addonServiceIds);
}

/** Replaces the whole chain — the editor always knows the complete list. */
export function replaceServiceAddons(
  slug: string,
  serviceId: string,
  addonServiceIds: string[],
): Promise<{ addonServiceIds: string[] }> {
  return clientApiFetch<{ addonServiceIds: string[] }>(
    `/organizations/${slug}/services/${serviceId}/addons`,
    { method: 'PUT', body: JSON.stringify({ addonServiceIds }) },
  );
}
