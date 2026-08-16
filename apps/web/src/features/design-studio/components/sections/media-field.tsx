'use client';

import { CENTER_FOCAL, type FocalPoint, type MediaDecision } from '@amolie/shared-kernel';
import { Trash } from '@phosphor-icons/react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { UploadDropzone } from '@/components/upload-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';

/**
 * Фокусная точка: перетаскивание по миниатюре задаёт, что обрезка держит в
 * центре — лицо, руки, работа (DESIGN_STUDIO.md §5.3).
 *
 * Механизм один для всех медиа-ручек, поэтому и компонент один. На указателе,
 * а не на мыши: телефон здесь первый, и точка обязана ставиться пальцем.
 * Клавиатура двигает точку стрелками — иначе ручка существовала бы только
 * для тех, у кого есть указатель.
 */
export function FocalPicker({
  url,
  focal,
  onChange,
  label,
}: {
  url: string;
  focal: FocalPoint;
  onChange: (focal: FocalPoint) => void;
  label: string;
}) {
  const frame = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function pointTo(event: ReactPointerEvent<HTMLDivElement>) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
    onChange({
      x: clamp(((event.clientX - box.left) / box.width) * 100),
      y: clamp(((event.clientY - box.top) / box.height) * 100),
    });
  }

  return (
    <div
      ref={frame}
      role="application"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        pointTo(event);
      }}
      onPointerMove={(event) => dragging && pointTo(event)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 2;
        const move: Record<string, FocalPoint> = {
          ArrowLeft: { x: focal.x - step, y: focal.y },
          ArrowRight: { x: focal.x + step, y: focal.y },
          ArrowUp: { x: focal.x, y: focal.y - step },
          ArrowDown: { x: focal.x, y: focal.y + step },
        };
        const next = move[event.key];
        if (!next) return;
        event.preventDefault();
        onChange({
          x: Math.min(100, Math.max(0, next.x)),
          y: Math.min(100, Math.max(0, next.y)),
        });
      }}
      className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden border border-border bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Мастер вставляет произвольный адрес — обычный <img>, а не оптимизатор
          next/image, открытый на любой удалённый хост. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg-raised bg-accent"
        style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
      />
    </div>
  );
}

/**
 * Медиа-ручка целиком: файл или ссылка, мгновенная примерка, фокусная точка
 * и честный фолбэк (§5.3).
 *
 * Загрузка стоит первой, ссылка — второй: у мастера фотография лежит в
 * телефоне, а не на хостинге, и требовать от неё адрес значило требовать
 * лишний шаг, которого она не сделает. Ссылка осталась, потому что у части
 * мастеров кадры уже разложены по своим галереям.
 *
 * Битая ссылка не считается ошибкой формы — она называется словами, а холст
 * продолжает показывать фолбэк, ровно как у клиента.
 */
export function MediaField({
  media,
  onChange,
  hint,
  focalLabel,
}: {
  media: MediaDecision | null;
  onChange: (media: MediaDecision | null) => void;
  hint?: string;
  focalLabel: string;
}) {
  const t = useT();
  const [broken, setBroken] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <UploadDropzone
        target="page"
        hasImage={Boolean(media)}
        onStart={() => setBroken(false)}
        onUploaded={(url) =>
          // Фокусная точка переживает замену кадра: мастер уже сказала, что
          // держать в центре, и новое фото чаще всего снято так же.
          onChange({ url, focal: media?.focal ?? CENTER_FOCAL })
        }
      />

      <div className="flex items-center gap-2">
        <Input
          value={media?.url ?? ''}
          inputMode="url"
          placeholder="https://…"
          aria-label={t.studio.mediaLink}
          onChange={(event) => {
            setBroken(false);
            const url = event.target.value.trim();
            onChange(url ? { url, focal: media?.focal ?? CENTER_FOCAL } : null);
          }}
        />
        {media ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t.studio.mediaRemove}
            onClick={() => onChange(null)}
          >
            <Trash size={16} />
          </Button>
        ) : null}
      </div>

      {media ? (
        <>
          {/* Проверка ссылки — отдельная от кадра: изображение фокусной точки
              может не загрузиться, и сказать об этом нужно словами. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt=""
            className="hidden"
            onError={() => setBroken(true)}
            onLoad={() => setBroken(false)}
          />
          {broken ? (
            <p className="bg-warning-soft px-3 py-2 text-xs text-warning">{t.studio.mediaBroken}</p>
          ) : (
            <>
              <FocalPicker
                url={media.url}
                focal={media.focal}
                label={focalLabel}
                onChange={(focal) => onChange({ url: media.url, focal })}
              />
              <p className="text-[11px] leading-relaxed text-ink-faint">
                {t.studio.mediaFocalHint}
              </p>
            </>
          )}
        </>
      ) : null}

      {hint ? <p className="text-[11px] leading-relaxed text-ink-faint">{hint}</p> : null}
    </div>
  );
}
