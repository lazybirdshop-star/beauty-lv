import { ApiError } from './server-api';

/**
 * For Client Components (React Query hooks) — goes through the same-origin
 * `/api/proxy`, never touches the access token directly.
 */
export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  return response.json() as Promise<T>;
}
