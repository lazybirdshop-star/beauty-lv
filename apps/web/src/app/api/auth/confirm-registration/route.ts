import type { NextResponse } from 'next/server';

import { establishSession } from '@/lib/auth-session';

/**
 * Обмен ссылки «стать мастером» на сессию.
 *
 * Отдельный маршрут, а не вызов API из браузера: токен доступа обязан стать
 * httpOnly-кукой и никогда не оказаться в руках браузерного JS — тот же путь
 * и тот же помощник, что у входа и регистрации.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  return establishSession('/auth/registration/confirm-upgrade', body, request);
}
