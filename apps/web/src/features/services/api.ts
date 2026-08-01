import { clientApiFetch } from '@/lib/client-api';

import type { Service, ServiceFormValues } from './types';

export function listServices(slug: string): Promise<Service[]> {
  return clientApiFetch<Service[]>(`/organizations/${slug}/services`);
}

export function createService(slug: string, values: ServiceFormValues): Promise<Service> {
  return clientApiFetch<Service>(`/organizations/${slug}/services`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateService(
  slug: string,
  serviceId: string,
  values: Partial<ServiceFormValues>,
): Promise<Service> {
  return clientApiFetch<Service>(`/organizations/${slug}/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function deleteService(slug: string, serviceId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/services/${serviceId}`, {
    method: 'DELETE',
  });
}
