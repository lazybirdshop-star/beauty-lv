import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Собственный токен администратора, пока он ходит по чужому кабинету.
 *
 * Лежит рядом, а не заменяется: без него выход из режима поддержки означал бы
 * повторный вход в панель по паролю после каждого разбора обращения. Он же —
 * единственный признак, по которому кабинет узнаёт, что за столом не хозяйка:
 * сам токен доступа httpOnly, и разобрать его в браузере нечем.
 */
export const IMPERSONATOR_TOKEN_COOKIE = 'impersonator_token';
// Matches apps/api's dev-mode 12h JWT TTL (shared/auth/shared-auth.module.ts).
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

/** Столько же, сколько живёт токен поддержки на стороне API. */
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 30;

/** Флаги куки сессии — одни и те же у входа, регистрации и режима поддержки. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

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

  /* Подпись хопа — без неё API не поверит адресу выше и посчитает попытку
     входа по адресу самого BFF, то есть свалит всех в один счётчик. */
  const proxySecret = process.env.INTERNAL_PROXY_SECRET;

  const apiResponse = await fetch(`${apiUrl}${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      ...(proxySecret ? { 'X-Internal-Proxy-Secret': proxySecret } : {}),
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    return NextResponse.json(data, { status: apiResponse.status });
  }

  const { accessToken, redirectUrl, user } = data as {
    accessToken?: string;
    redirectUrl: string | null;
    user: unknown;
  };

  /*
   * Успех без токена — это принятая заявка на регистрацию: платформа
   * закрыта, аккаунта ещё нет, и входить некуда. Ответ проходит насквозь,
   * а куки не появляется: сессия без аккаунта — это сессия в никуда.
   */
  if (!accessToken) {
    return NextResponse.json(data, { status: apiResponse.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    sessionCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );

  return NextResponse.json({ redirectUrl, user });
}
