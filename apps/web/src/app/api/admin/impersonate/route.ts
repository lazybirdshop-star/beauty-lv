import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE,
  IMPERSONATION_MAX_AGE_SECONDS,
  IMPERSONATOR_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth-session';

/**
 * Вход администратора в кабинет мастера.
 *
 * Обмен куками делается здесь, а не в API: токен доступа httpOnly и в браузер
 * не попадает — значит и подменить его может только сервер. Собственный токен
 * администратора уезжает в соседнюю куку целым: без этого выход из режима
 * поддержки означал бы повторный вход по паролю после каждого обращения.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { masterId } = (await request.json()) as { masterId?: string };
  if (!masterId) {
    return NextResponse.json({ message: 'masterId обязателен' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!adminToken) {
    return NextResponse.json({ message: 'Нет сессии' }, { status: 401 });
  }

  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const apiResponse = await fetch(`${apiUrl}/admin/masters/${masterId}/impersonate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const data: unknown = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    return NextResponse.json(data, { status: apiResponse.status });
  }

  const { accessToken, redirectUrl, masterName } = data as {
    accessToken: string;
    redirectUrl: string;
    masterName: string;
  };

  cookieStore.set(
    IMPERSONATOR_TOKEN_COOKIE,
    adminToken,
    sessionCookieOptions(IMPERSONATION_MAX_AGE_SECONDS),
  );
  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    sessionCookieOptions(IMPERSONATION_MAX_AGE_SECONDS),
  );

  return NextResponse.json({ redirectUrl, masterName });
}
