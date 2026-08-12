'use client';

import { styleLimits, type PageDesign } from '@amolie/shared-kernel';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

import { MediaField } from './media-field';

/**
 * Фото страницы: шапка, её видео и портрет мастера (DESIGN_STUDIO.md
 * §5.3–5.6).
 *
 * Три строки инспектора сведены в одну секцию, потому что мастер приходит
 * сюда с одним намерением — «поставить свои фотографии», — а не с тремя.
 * Видео при этом осталось огороженным: без фото-постера его поля просто нет,
 * а не есть с предупреждением.
 *
 * Портрет показывается **только в мирах, где он существует**
 * (`STYLE_LIMITS.masterPhoto`). Плакат его не рисует: его шапка — печатное
 * поле с именем во всю меру. Пока Студия предлагала портрет всем, мастер на
 * плакате загружала фото и не находила его на странице.
 *
 * Обработка — вуаль, скрим, насыщенность — сюда не выведена и не будет: она
 * собственность стиля. Страница обязана выдержать любой вход, а не предложить
 * двадцать способов его испортить.
 */
export function PhotosSection({
  design,
  onChange,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
}) {
  const t = useT();
  const limits = styleLimits(design.style);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-ink-soft">{t.studio.sectionHeroPhoto}</span>
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

        {design.heroPhoto ? (
          <>
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
            {/* Законы видео не предлагаются, а выполняются; словами названо
                только то, что мастер решает сама, — вес и длительность. */}
            <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.videoLaws}</p>
          </>
        ) : null}
      </div>

      {limits.masterPhoto ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
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
      ) : null}
    </div>
  );
}
