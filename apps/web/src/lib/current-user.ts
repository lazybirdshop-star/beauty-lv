import { cache } from 'react';

import { serverApiFetch } from '@/lib/server-api';

/**
 * Имя, под которым мастер или администратор сидит в панели.
 *
 * Спрашивается на сервере и приезжает в разметке первого кадра: карточка
 * аккаунта стоит в углу боковой панели, и если бы имя дозагружалось, угол
 * панели мигал бы на каждом переходе.
 *
 * Обёрнуто в `cache()`: layout и экран внутри него спрашивают одно и то же в
 * одном проходе рендера, а `serverApiFetch` ходит с `cache: 'no-store'` и сам
 * ничего не склеит.
 *
 * Пустая строка вместо ошибки: панель без имени в углу работает, панель,
 * упавшая из-за имени в углу, — нет.
 */
export const currentUserName = cache(async (): Promise<string> => {
  try {
    const { user } = await serverApiFetch<{ user: { fullName: string } }>('/auth/me');
    return user.fullName;
  } catch {
    return '';
  }
});
