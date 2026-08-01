import { clientApiFetch } from '@/lib/client-api';

import type { Client, ClientFormValues } from './types';

export function listClients(slug: string): Promise<Client[]> {
  return clientApiFetch<Client[]>(`/organizations/${slug}/clients`);
}

export function createClient(slug: string, values: ClientFormValues): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateClient(
  slug: string,
  clientId: string,
  values: Partial<ClientFormValues>,
): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${clientId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function deleteClient(slug: string, clientId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/clients/${clientId}`, {
    method: 'DELETE',
  });
}

export function setClientBlocked(
  slug: string,
  clientId: string,
  isBlocked: boolean,
): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${clientId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ isBlocked }),
  });
}
