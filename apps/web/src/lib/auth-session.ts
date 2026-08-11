import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';
// Matches apps/api's dev-mode 12h JWT TTL (shared/auth/shared-auth.module.ts).
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * The only place the raw access token ever exists outside the backend's
 * response: it becomes an httpOnly cookie here and is never handed to
 * browser JS (see the dashboard-architecture plan §2). Shared by login and
 * registration so the cookie flags can't drift between two copies.
 */
export async function establishSession(
  apiPath: string,
  body: unknown,
  request: Request,
): Promise<NextResponse> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  /*
   * The visitor's address, forwarded so the API's rate limiter counts sign-in
   * and registration attempts against whoever is making them. This call is
   * server-to-server; without it every attempt on the platform would share
   * one bucket and a single password-guessing script would lock out all
   * masters at once (see the API's ClientThrottlerGuard).
   */
  const forwardedFor = request.headers.get('x-forwarded-for');

  const apiResponse = await fetch(`${apiUrl}${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    return NextResponse.json(data, { status: apiResponse.status });
  }

  const { accessToken, redirectUrl, user } = data as {
    accessToken: string;
    redirectUrl: string | null;
    user: unknown;
  };

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ redirectUrl, user });
}
