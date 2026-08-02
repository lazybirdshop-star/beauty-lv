import type { NextResponse } from 'next/server';

import { establishSession } from '@/lib/auth-session';

/** Registration logs the new master straight in — same cookie handling as login. */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  return establishSession('/auth/register', body);
}
