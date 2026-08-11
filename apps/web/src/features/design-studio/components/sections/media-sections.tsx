'use client';

import type { PageDesign } from '@amolie/shared-kernel';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

import { MediaField } from './media-field';

interface SectionProps {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
}

/**
 * Фото шапки — самая сильная эмоциональная ручка (DESIGN_STUDIO.md §5.3).
 *
 * Обработка — вуаль, скрим, насыщенность — сюда не выведена и не будет:
 * она собственность стиля. Страница обязана выдержать любой вход, а не
 * предложить двадцать способов его испортить. Арт-дирекшн стоит строкой
 * рядом с полем, а не в справке, — совет нужен в момент вставки ссылки.
 */
export function HeroPhotoSection({ design, onChange }: SectionProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2.5">
      <MediaField
        media={design.heroPhoto}
        focalLabel={t.studio.mediaFocal}
        onChange={(media) =>
          onChange({
            ...design,
            heroPhoto: media,
            /* Постер обязателен: без фото видео не бывает (§5.4 п.3), и
               снимать его молча честнее, чем оставить ссылку, которая
               никогда не заиграет. */
            heroVideo: media ? design.heroVideo : null,
          })
        }
      />
      <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.heroArtDirection}</p>
      <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.heroSizeHint}</p>
    </div>
  );
}

/**
 * Видео шапки: новая грань первого экрана, введённая сразу огороженной
 * (§5.4). Ручка недоступна без фото, потому что фото — её постер: первый
 * кадр на медленной сети и честный фолбэк при любой неудаче.
 */
export function HeroVideoSection({ design, onChange }: SectionProps) {
  const t = useT();

  if (!design.heroPhoto) {
    return (
      <p className="rounded-xl bg-bg-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
        {t.studio.videoNeedsPhoto}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        value={design.heroVideo?.url ?? ''}
        inputMode="url"
        placeholder="https://…/loop.mp4"
        aria-label={t.studio.videoLink}
        onChange={(event) => {
          const url = event.target.value.trim();
          onChange({ ...design, heroVideo: url ? { url } : null });
        }}
      />
      {/* Законы видео не предлагаются, а выполняются; словами названо только
          то, что мастер может решить сама — вес и длительность. */}
      <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.videoLaws}</p>
    </div>
  );
}

/** Лицо страницы (§5.6). Форма аватара — собственность стиля и ручкой не является. */
export function MasterPhotoSection({ design, onChange }: SectionProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm text-ink">{t.studio.showMasterPhoto}</span>
        <Switch
          checked={design.masterPhoto.shown}
          onCheckedChange={(shown) =>
            onChange({ ...design, masterPhoto: { ...design.masterPhoto, shown } })
          }
        />
      </label>

      {design.masterPhoto.shown ? (
        <MediaField
          media={design.masterPhoto.media}
          focalLabel={t.studio.mediaFocal}
          hint={t.studio.masterPhotoShapeHint}
          onChange={(media) =>
            onChange({ ...design, masterPhoto: { ...design.masterPhoto, media } })
          }
        />
      ) : null}
    </div>
  );
}
