import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Coarse gate, run on every matched request before any layout/page: is
 * there a validly-signed, unexpired token, and (for /admin) does its role
 * claim allow it. This is authentication plus the cheapest possible
 * authorization check — it never does a DB round trip, so it never decides
 * "is this the right organization for /[slug]/dashboard/*" (that
 * fine-grained check lives in app/[slug]/dashboard/layout.tsx, a Server
 * Component with real DB access — see the dashboard-architecture plan §2).
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return loginRedirect(request);
  }

  let payload: AccessTokenPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const result = await jwtVerify<AccessTokenPayload>(token, secret);
    payload = result.payload;
  } catch {
    return loginRedirect(request);
  }

  if (request.nextUrl.pathname.startsWith('/admin') && payload.role !== 'platform_admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/**
 * The Studio is listed alongside the dashboard because it is the same guarded
 * area wearing different chrome (DESIGN_STUDIO.md §1) — it edits the master's
 * public page. Its layout does call `requireOrganization`, so it was never
 * open; without this line the turn-away simply happened a layer later, as a
 * server render rather than a redirect.
 */
export const config = {
  matcher: ['/admin/:path*', '/:slug/dashboard/:path*', '/:slug/studio/:path*'],
};
