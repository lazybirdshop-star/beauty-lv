'use client';

import type { MediaDecision } from '@amolie/shared-kernel';
import { useCallback, useRef, useState } from 'react';

import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';

import { clearMyAvatar, saveMyAvatar } from './api';

/**
 * Портрет мастера в Студии — вне черновика, отмены и публикации.
 *
 * Это не упрощение, а следствие того, где снимок живёт: он принадлежит
 * человеку (`organization_members.avatar_url`), а не оформлению страницы.
 * Поэтому у него нет паузы автосохранения, нет места в стеке отмены и нет
 * строки в сводке публикации — он применяется сразу, как и всё остальное, что
 * человек говорит о себе.
 *
 * Отдельным хуком, а не полем `useStudio`: тот держит **черновик** и всю его
 * механику, и снимок, попавший в него, немедленно поехал бы в автосохранение
 * и в историю версий — ровно то, ради ухода от чего фото и переехало из
 * `page_design`.
 *
 * Витрина гасится тем же вызовом, что и после публикации: страница помнит
 * себя до пяти минут, а мастер, поставившая фотографию, идёт смотреть её
 * сейчас.
 */
export function useMasterAvatar(slug: string, initial: MediaDecision | null) {
  const [avatar, setAvatar] = useState<MediaDecision | null>(initial);
  /* То, что стояло до правки: неудачный запрос обязан вернуть картинку к
     правде сервера, а не оставить на холсте лицо, которого там нет. */
  const previous = useRef<MediaDecision | null>(initial);

  const save = useCallback(
    async (next: MediaDecision | null) => {
      previous.current = avatar;
      /* Оптимистично: холст и поле показывают новый снимок в том же кадре,
         в каком мастер его выбрала, а не через круг ожидания. */
      setAvatar(next);
      try {
        const saved = next ? await saveMyAvatar(slug, next) : await clearMyAvatar(slug);
        setAvatar(saved);
        await revalidatePublicProfile(slug);
      } catch (error) {
        setAvatar(previous.current);
        throw error;
      }
    },
    [avatar, slug],
  );

  return { avatar, save };
}
