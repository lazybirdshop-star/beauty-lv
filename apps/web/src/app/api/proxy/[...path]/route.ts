import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/**
 * Same-origin BFF proxy: Client Components (React Query) call
 * `/api/proxy/...` and never see the access token — it's read from the
 * httpOnly cookie here and forwarded as `Authorization: Bearer`. See the
 * dashboard-architecture plan §2.
 */
async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const targetUrl = `${API_URL}/${path.join('/')}${request.nextUrl.search}`;
  const contentType = request.headers.get('content-type');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const apiResponse = await fetch(targetUrl, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
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
