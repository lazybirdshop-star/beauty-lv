import { clientApiFetch } from '@/lib/client-api';

import type { ServiceCategory, ServiceCategoryFormValues } from './types';

export function listServiceCategories(slug: string): Promise<ServiceCategory[]> {
  return clientApiFetch<ServiceCategory[]>(`/organizations/${slug}/service-categories`);
}

export function createServiceCategory(
  slug: string,
  values: ServiceCategoryFormValues,
): Promise<ServiceCategory> {
  return clientApiFetch<ServiceCategory>(`/organizations/${slug}/service-categories`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateServiceCategory(
  slug: string,
  categoryId: string,
  values: Partial<ServiceCategoryFormValues>,
): Promise<ServiceCategory> {
  return clientApiFetch<ServiceCategory>(
    `/organizations/${slug}/service-categories/${categoryId}`,
    { method: 'PATCH', body: JSON.stringify(values) },
  );
}

export function deleteServiceCategory(slug: string, categoryId: string): Promise<{ id: string }> {
  return clientApiFetch<{ id: string }>(`/organizations/${slug}/service-categories/${categoryId}`, {
    method: 'DELETE',
  });
}

/** Sends the whole order, not a delta — the server rewrites `sort_order` from the array index. */
export function reorderServiceCategories(
  slug: string,
  orderedIds: string[],
): Promise<ServiceCategory[]> {
  return clientApiFetch<ServiceCategory[]>(`/organizations/${slug}/service-categories/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}
