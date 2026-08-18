import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/**
 * Same-origin BFF proxy: Client Components (React Query) call
 * `/api/proxy/...` and never see the access token — it's read from the
 * httpOnly cookie here and forwarded as `Authorization: Bearer`. See the
 * dashboard-architecture plan §2.
 *
 * A missing cookie is *not* rejected here: guests calling a genuinely
 * public endpoint (e.g. `public-bookings`) have no cookie at all, and the
 * backend's own guards are what actually enforce auth on the guarded
 * routes — this proxy just forwards whatever credential it has, if any.
 */
async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;

  const targetUrl = `${API_URL}/${path.join('/')}${request.nextUrl.search}`;
  const contentType = request.headers.get('content-type');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  /*
   * Who the visitor is, for the API's rate limiter.
   *
   * This hop is server-to-server, so without forwarding the caller's address
   * every request would reach the API wearing this server's IP and the whole
   * user base would be metered as one client (see the API's
   * ClientThrottlerGuard). Anonymous routes — sign-in, guest booking — have
   * nothing else to be counted against.
   */
  const forwardedFor = request.headers.get('x-forwarded-for');

  /*
   * Подпись хопа: API верит адресу выше только от того, кто её предъявил.
   * Без неё заголовок ставил бы кто угодно — машина опубликована в интернет,
   * — и лимитер считал бы по строке, которую выбирает сам нарушитель.
   */
  const proxySecret = process.env.INTERNAL_PROXY_SECRET;

  const apiResponse = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      ...(proxySecret ? { 'X-Internal-Proxy-Secret': proxySecret } : {}),
    },
    body: hasBody ? await request.text() : undefined,
  });

  const body = await apiResponse.text();
  return new NextResponse(body, {
    status: apiResponse.status,
    headers: { 'Content-Type': apiResponse.headers.get('content-type') ?? 'application/json' },
  });
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function POST(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
