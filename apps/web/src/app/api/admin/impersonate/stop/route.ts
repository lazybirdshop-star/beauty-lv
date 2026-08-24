import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  IMPERSONATOR_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth-session';

/**
 * Выход из чужого кабинета обратно в панель.
 *
 * Отсутствие сохранённого токена — не ошибка: сессия поддержки живёт полчаса
 * и могла истечь вместе с ней. Тогда чужой токен просто убирается, и человек
 * оказывается на входе — там, где и должен оказаться тот, у кого нет сессии.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(IMPERSONATOR_TOKEN_COOKIE)?.value;

  cookieStore.delete(IMPERSONATOR_TOKEN_COOKIE);

  if (!adminToken) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    return NextResponse.json({ redirectUrl: '/login' });
  }

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    adminToken,
    sessionCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );

  return NextResponse.json({ redirectUrl: '/admin' });
}
