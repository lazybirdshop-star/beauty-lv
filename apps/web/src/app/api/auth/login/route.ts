import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';
// Matches apps/api's dev-mode 12h JWT TTL (shared/auth/shared-auth.module.ts).
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * The only place the raw access token ever exists outside the backend's
 * response. It's set as an httpOnly cookie here and never handed to
 * browser JS — see the dashboard-architecture plan §2.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  const apiResponse = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
