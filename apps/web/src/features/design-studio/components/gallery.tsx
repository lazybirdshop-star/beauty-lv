'use client';

import { BRAND_DESIGN_PRESET_KEYS, DESIGN_PRESETS, type PageDesign } from '@amolie/shared-kernel';

import { Button } from '@/components/ui/button';
import { designCopy } from '@/features/organization-profile/preset-copy';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { fmt, useT } from '@/lib/i18n';

import { applyStyle } from './sections/style-section';

/**
 * Первый вход — галерея, а не пустой инспектор (DESIGN_STUDIO.md §5.1, §8).
 *
 * Первое решение мастера — самое приятное, и оно одно заметно меняет всё:
 * шесть живых образов, собранных на данных её же страницы, с именем,
 * характером и обещанием одной фразой. Не «тема №3», а «ваша студия в шести
 * возможных жизнях».
 *
 * Страница на прежних осях показывается как «текущий вид (архив)» с мягким
 * предложением ближайшего стиля: ничего не переобувается молча, переход —
 * решение мастера, нажатие — её.
 */
export function StyleGallery({
  design,
  archived,
  onChoose,
  onSkip,
}: {
  design: PageDesign;
  archived: boolean;
  onChoose: (design: PageDesign) => void;
  onSkip: () => void;
}) {
  const t = useT();
  const nearest = DESIGN_PRESETS[design.style];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg-sunken">
      <header className="flex flex-col gap-2 px-5 pb-4 pt-8 text-center lg:pt-12">
        <h1 className="font-display text-2xl leading-tight text-ink lg:text-3xl">
          {t.studio.galleryTitle}
        </h1>
        <p className="mx-auto max-w-prose text-sm text-ink-soft">{t.studio.galleryText}</p>
      </header>

      {archived ? (
        <div className="mx-auto mb-4 w-full max-w-3xl px-5">
          <div className="rounded-2xl border border-border bg-bg-raised p-4">
            <p className="text-sm font-semibold text-ink">{t.studio.archiveTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {fmt(t.studio.archiveText, { style: nearest.name })}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-3xl gap-4 px-5 pb-8 sm:grid-cols-2">
        {BRAND_DESIGN_PRESET_KEYS.map((key) => {
          const candidate = applyStyle(design, key);
          const copy = designCopy(key, t);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChoose(candidate)}
              className="press flex cursor-pointer flex-col gap-2 rounded-3xl border-2 border-border bg-bg-raised p-3 text-left hover:border-accent"
            >
              <WorldThumbnail design={candidate} height={260} />
              <span className="px-1 pb-1">
                <span className="block text-sm font-semibold text-ink">{copy.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {copy.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-bg-raised px-5 py-3">
        <Button variant="secondary" className="w-full" onClick={onSkip}>
          {t.studio.gallerySkip}
        </Button>
      </footer>
    </div>
  );
}
