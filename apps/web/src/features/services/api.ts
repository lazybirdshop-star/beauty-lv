import { clientApiFetch } from '@/lib/client-api';

import type { Service, ServiceFormValues } from './types';

/**
 * A cleared photo field must reach the API as `null`, not `''` — an empty
 * string fails the URL validator, and `undefined` would mean "leave as is",
 * making the photo impossible to remove.
 */
function toPayload(values: Partial<ServiceFormValues>) {
  if (values.imageUrl === undefined) return values;
  return { ...values, imageUrl: values.imageUrl.trim() || null };
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
