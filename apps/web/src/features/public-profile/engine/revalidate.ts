'use server';

import { revalidateTag } from 'next/cache';

import { serverApiFetch } from '@/lib/server-api';

import { publicProfileTag } from './public-profile-cache';

/**
 * «Забудь то, что ты помнишь про эту страницу» — после публикации из Студии,
 * отката версии и сохранения профиля.
 *
 * Членство проверяется, хотя действие ничего не читает и не пишет: без
 * проверки любой желающий гасил бы кэш любого мастера в цикле и превращал
 * публичную страницу обратно в четыре запроса к API на каждого посетителя.
 * Отвечает одинаково в обоих случаях — сообщать тут нечего и некому.
 */
export async function revalidatePublicProfile(slug: string): Promise<void> {
  const mine = await serverApiFetch<{ slug: string }>('/organizations/me').catch(() => null);
  if (mine?.slug !== slug) return;

  /* `{ expire: 0 }`, а не именованный профиль: мастер только что нажала
     «Опубликовать» и пошла смотреть свою страницу. Разрешить отдать ей
     устаревшую копию «ещё немного» значит ответить на её действие тем же
     экраном, что был до него, — и она нажмёт ещё раз. */
  revalidateTag(publicProfileTag(slug), { expire: 0 });
}
