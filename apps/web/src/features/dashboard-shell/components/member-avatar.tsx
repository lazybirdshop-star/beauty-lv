import type { CSSProperties } from 'react';

import { avatarTint, initials } from '@/lib/avatar';

/**
 * Лицо участника в кружке — фото с точкой кадра, а без фото инициалы.
 *
 * Одна разметка на весь кабинет: колонка мастера в календаре, фильтр людей,
 * пульс команды, страница участника и карточка аккаунта. Раньше везде стояли
 * инициалы, хотя фото у человека было, — и владелица узнавала Юлю по букве
 * «Ю», а не по лицу, которое видят клиенты.
 *
 * Точка кадра — та же, что на странице записи: лицо в круге держится там, где
 * его поставили, а не по центру снимка. Без клиентских хуков, чтобы годился и
 * серверным экранам вроде «Сегодня».
 */
export function MemberAvatar({
  name,
  seed,
  url,
  focal,
  className,
  style,
}: {
  name: string;
  /** Из чего выбирается тон подложки у инициалов — обычно id участника. */
  seed: string;
  url?: string | null;
  focal?: { x: number; y: number } | null;
  className?: string;
  style?: CSSProperties;
}) {
  const classes = ['avatar', url ? 'avatar--photo' : '', className ?? ''].filter(Boolean).join(' ');

  if (url) {
    return (
      <span className={classes} style={style} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- снимок из хранилища организации, вне оптимизатора Next */}
        <img
          src={url}
          alt=""
          loading="lazy"
          style={{ objectPosition: `${focal?.x ?? 50}% ${focal?.y ?? 50}%` }}
        />
      </span>
    );
  }

  return (
    <span className={classes} style={{ ...avatarTint(seed), ...style }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
