import type { NextResponse } from 'next/server';

import { establishSession } from '@/lib/auth-session';

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  return establishSession('/auth/login', body, request);
}
