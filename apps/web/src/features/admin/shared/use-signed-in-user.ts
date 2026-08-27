'use client';

import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/features/account-settings/api';

/**
 * Кто сейчас в панели — чтобы не рисовать ему кнопки против себя самого.
 *
 * Сервер отказывает в действиях на собственный аккаунт (`cannot_target_self`),
 * и это последнее слово. Но кнопка, которая всегда отказывает, существовать не
 * должна: в списке пользователей администратор видел «Изменить роль» и
 * «Заблокировать» на своей же строке, рядом с такими же кнопками соседних.
 *
 * Отдельный запрос, а не контекст на всю панель: это единственное место, где
 * панели нужен собственный идентификатор, а `staleTime` держит ответ на всё
 * время сессии — «кто я» между экранами не меняется.
 */
export function useSignedInUserId(): string | null {
  const { data } = useQuery({
    queryKey: ['signed-in-user'],
    queryFn: getMe,
    staleTime: Infinity,
  });
  return data?.id ?? null;
}
