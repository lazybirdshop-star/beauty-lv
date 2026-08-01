import { cookies } from 'next/headers';

import { ApiError } from './api-error';

/**
 * For Server Components / Route Handlers only — reads the httpOnly cookie
 * directly and calls the API server-to-server (no proxy hop needed, this
 * code never runs in the browser). Client Components should use
 * `lib/client-api.ts` instead, which goes through `/api/proxy`.
 */
export async function serverApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await cookies()).get('access_token')?.value;
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  return response.json() as Promise<T>;
}
