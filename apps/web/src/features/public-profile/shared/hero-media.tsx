'use client';

import type { MediaDecision, PageDesign } from '@amolie/shared-kernel';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Медиа первого экрана: фото шапки и — поверх него — видео (§5.3–5.4).
 *
 * Компонент общий для всех миров намеренно. Композиция шапки принадлежит
 * миру и здесь не решается: он получает только класс кадра. А вот **законы**
 * медиа принадлежат продукту и одинаковы везде, поэтому пять копий этих
 * законов означали бы пять мест, где видео однажды заиграет со звуком:
 *
 * 1. Только ссылка; `muted`, `playsinline`, `loop` — всегда; ни звука, ни
 *    элементов управления. Это фон, а не плеер.
 * 2. **Постером служит фото шапки** — видео без фото не существует уже на
 *    уровне контракта (`sanitizePageDesign`), а здесь фото остаётся видимым
 *    до первого кадра и возвращается при любой неудаче.
 * 3. `prefers-reduced-motion` — видео не заводится никогда, стоит постер.
 *    Проверяется в браузере, а не только через CSS: не запустить дешевле,
 *    чем запустить и спрятать.
 * 4. Битая ссылка — не ошибка, а норма: фолбэк молча показывает фото.
 */
export function HeroMedia({
  design,
  className,
  imageClassName,
}: {
  design: PageDesign;
  /** Кадр мира: рамка, маска, скруглeние — его собственность. */
  className?: string;
  imageClassName?: string;
}) {
  const photo = design.heroPhoto;
  const video = design.heroVideo;
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  const playVideo = Boolean(video) && !videoFailed && !reducedMotion;

  useEffect(() => {
    if (!playVideo) return;
    const element = ref.current;
    if (!element) return;
    /* Автовоспроизведение может быть отклонено политикой браузера — это не
       ошибка страницы, а причина остаться на постере. */
    void element.play().catch(() => setVideoFailed(true));
  }, [playVideo, video?.url]);

  if (!photo) return null;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Фото — и постер, и фолбэк. Мастера вставляют произвольный адрес,
          поэтому обычный <img>, а не next/image с открытым оптимизатором. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt=""
        className={cn(
          'h-full w-full object-cover [object-position:var(--hero-focal)]',
          imageClassName,
        )}
      />

      {playVideo ? (
        <video
          ref={ref}
          src={video!.url}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover [object-position:var(--hero-focal)]',
            /* Первый кадр приходит проявлением, а не подменой: мгновенная
               смена картинки — тот самый антипаттерн А4. */
            'transition-opacity duration-[var(--dur-reveal)] ease-[var(--ease-style)]',
            videoReady ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
        />
      ) : null}
    </div>
  );
}

/**
 * Кадр мира занимает фото шапки; когда её нет — портрет мастера, если она его
 * показывает.
 *
 * Снимок приходит вторым доводом, а не из дизайна: макет решает, показывать ли
 * портрет, а чьё это лицо — знает страница, которая его открыла.
 */
export function heroFrameUrl(design: PageDesign, avatar: MediaDecision | null): string | undefined {
  return design.heroPhoto?.url ?? (design.masterPhoto.shown ? avatar?.url : undefined);
}

/**
 * Кадр мира с тем, что в него попадает: шапка с её видео или портрет мастера.
 *
 * Мир Luxury показывает в раме одно поле, а не два, и правило приоритета
 * у него своё. Точка кадрирования при этом берётся своя для
 * каждой ручки: у шапки — `--hero-focal`, у портрета — `--avatar-focal`.
 */
export function HeroFrameMedia({
  design,
  avatar,
  className,
  imageClassName,
}: {
  design: PageDesign;
  avatar: MediaDecision | null;
  className?: string;
  imageClassName?: string;
}) {
  if (design.heroPhoto) {
    return <HeroMedia design={design} className={className} imageClassName={imageClassName} />;
  }

  const portrait = design.masterPhoto.shown ? avatar : null;
  if (!portrait) return null;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Masters paste an arbitrary photo URL, so this stays a plain <img>
          rather than opening next/image's optimizer to any remote host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={portrait.url}
        alt=""
        className={cn(
          'h-full w-full object-cover [object-position:var(--avatar-focal)]',
          imageClassName,
        )}
      />
    </div>
  );
}

/**
 * Настройка посетителя сильнее настройки мастера — всегда (§6).
 *
 * Читается через `matchMedia`, а не через CSS, потому что решение здесь не
 * «как выглядит», а «запускать ли»: видео, спрятанное стилями, всё равно
 * скачано и всё равно играет.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}
