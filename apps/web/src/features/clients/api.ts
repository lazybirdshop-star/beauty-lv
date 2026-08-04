import { clientApiFetch } from '@/lib/client-api';

/**
 * An empty optional field must reach the API as `null`, never as `''`.
 * `@IsOptional()` only skips `undefined`, so an empty string was handed to
 * `@IsEmail` and came back 400 — which the screen then reported as "a client
 * with this phone already exists", a message about a rule that had not been
 * broken.
 */
function toPayload(values: object) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
  );
}

import type { Client, ClientFormValues } from './types';

export function listClients(slug: string): Promise<Client[]> {
  return clientApiFetch<Client[]>(`/organizations/${slug}/clients`);
}

export function createClient(slug: string, values: ClientFormValues): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients`, {
    method: 'POST',
    body: JSON.stringify(toPayload(values)),
  });
}

export function updateClient(
  slug: string,
  clientId: string,
  values: Partial<ClientFormValues>,
): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${clientId}`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(values)),
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
