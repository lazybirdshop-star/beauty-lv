import { cookies } from 'next/headers';

import { serverApiFetch } from '@/lib/server-api';

import type { KnownGuest } from './known-guest';

/**
 * Кто открыл публичную страницу — если это вошедший клиент.
 *
 * Кука проверяется до запроса: у гостя её нет, и без этой проверки каждая
 * страница мастера платила бы лишним походом в API за ответом «никто».
 * Наличие куки ничего не доказывает — судит по-прежнему API, — но её
 * отсутствие доказывает достаточно.
 *
 * Любая ошибка означает «гость»: протухшая сессия, мастер вместо клиента
 * (API отвечает 403), недоступный сервис. Публичная страница обязана
 * открыться в каждом из этих случаев — подстановка полей приятна, но не
 * настолько, чтобы ради неё не показать расписание.
 */
export async function getKnownGuest(): Promise<KnownGuest | null> {
  const hasSession = (await cookies()).has('access_token');
  if (!hasSession) return null;

  try {
    return await serverApiFetch<KnownGuest>('/client/profile');
  } catch {
    return null;
  }
}
