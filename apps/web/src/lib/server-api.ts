import { cookies, headers } from 'next/headers';

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

  /*
   * Forwarded for the API's rate limiter. Signed-in traffic is metered by
   * subject and would be fine without it, but a public profile page renders
   * with no token at all — and every such render arriving from this one
   * server IP would share a single bucket (see ClientThrottlerGuard).
   */
  const forwardedFor = (await headers()).get('x-forwarded-for');

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const raw = await response.text();
    /* The parsed body travels with the error: a 404 from the public profile
       may carry `movedTo` — the master's new address — and the page turns
       that into a redirect instead of a dead end. */
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      parsed = undefined;
    }
    throw new ApiError(response.status, raw || response.statusText, parsed);
  }

  return response.json() as Promise<T>;
}
