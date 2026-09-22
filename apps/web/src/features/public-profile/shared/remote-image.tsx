import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Идёт ли этот адрес через оптимизатор изображений.
 *
 * Зеркало `images.remotePatterns` из `next.config.ts`: своё хранилище и только
 * публичный путь в нём. Совпасть они обязаны буквально — `next/image` на
 * необъявленный хост не деградирует, а падает, и падает уже у посетителя.
 *
 * Адрес мастер может вставить и свой, произвольный: Студия этого не
 * запрещает. Такой адрес остаётся обычным `<img>` — не потому, что его не
 * хочется оптимизировать, а потому, что открывать оптимизатор любому хосту
 * значит держать открытый прокси на своём домене.
 */
export function isOptimizable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.startsWith('/storage/v1/object/public/')
    );
  } catch {
    return false;
  }
}

/**
 * Снимок, занимающий свой кадр целиком.
 *
 * Мастер грузит фотографию с телефона — три-пять мегабайт JPEG, — и на первом
 * экране публичной страницы она уезжала клиенту как есть, в мобильную сеть, по
 * ссылке из Instagram. Оптимизатор к тому моменту уже был настроен (avif и
 * webp, кэш на год), но `<img>` шёл мимо него: комментарии в коде ссылались на
 * времена, когда удалённые хосты не были объявлены вовсе.
 *
 * Кадр задаёт родитель — он `relative`, снимок раскладывается по нему `fill`.
 * Поэтому ни ширины, ни высоты здесь нет и скачка вёрстки не возникает.
 */
export function FrameImage({
  src,
  className,
  /** Первый экран: браузер обязан начать качать это до разбора остального. */
  priority = false,
  sizes = '100vw',
  /** Пусто по умолчанию: шапка и портрет — оформление, а не содержание. */
  alt = '',
}: {
  src: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  alt?: string;
}) {
  if (!isOptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- произвольный адрес мастера
      <img
        src={src}
        alt={alt}
        {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={82}
      className={cn('object-cover', className)}
    />
  );
}

/**
 * Снимок известного габарита — миниатюра услуги в строке прайса.
 *
 * Габарит приходит числами, а не только классом: без них браузер не знает
 * места под картинку до её загрузки, и строка прайса подпрыгивает. Класс мира
 * при этом остаётся главным — он задаёт видимый размер и скругление, числа
 * лишь описывают пропорцию и подсказывают оптимизатору, что качать.
 */
export function ThumbImage({
  src,
  className,
  size,
}: {
  src: string;
  className?: string;
  /** Сторона миниатюры в пикселях при обычной плотности. */
  size: number;
}) {
  if (!isOptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- произвольный адрес мастера
      <img
        src={src}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        className={cn('shrink-0 object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      quality={75}
      className={cn('shrink-0 object-cover', className)}
    />
  );
}
