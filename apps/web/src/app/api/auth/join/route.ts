import type { NextResponse } from 'next/server';

import { establishSession } from '@/lib/auth-session';

/**
 * Приём приглашения человеком, у которого аккаунта ещё нет.
 *
 * Отдельный маршрут, а не вызов API из браузера: ответ несёт токен доступа, и
 * он обязан стать httpOnly-кукой, а не строкой в памяти вкладки. Тот же путь
 * и тот же помощник, что у входа, регистрации и ссылки «стать мастером».
 *
 * Приглашённый **с** аккаунтом сюда не приходит: у него сессия уже есть, и
 * его запрос идёт обычным путём через `/api/proxy`, который эту сессию и
 * пересылает. Заводить второй способ выдать куку тому, у кого она есть,
 * значит заводить второй способ ошибиться.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as { token?: string } & Record<string, unknown>;
  const { token, ...payload } = body;
  return establishSession(
    `/team-invites/${encodeURIComponent(String(token ?? ''))}/accept`,
    payload,
    request,
  );
}
