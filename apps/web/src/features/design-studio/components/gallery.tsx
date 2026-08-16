'use client';

import { DESIGN_PRESETS, type PageDesign } from '@amolie/shared-kernel';

import { Button } from '@/components/ui/button';
import { OFFERED_DESIGN_KEYS } from '@/features/organization-profile/design-worlds';
import { designCopy } from '@/features/organization-profile/preset-copy';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { fmt, useT } from '@/lib/i18n';

import { applyStyle } from './sections/style-section';

/**
 * Первый вход — галерея, а не пустой инспектор (DESIGN_STUDIO.md §5.1, §8).
 *
 * Первое решение мастера — самое приятное, и оно одно заметно меняет всё:
 * живые образы, собранные на данных её же страницы, с именем, характером и
 * обещанием одной фразой. Не «тема №3», а «ваша студия в двух возможных
 * жизнях».
 *
 * Показывается **предложение каталога** (`OFFERED_DESIGN_KEYS`), а не список
 * брендовых ключей: галерея жила на своём списке и при регистрации предлагала
 * шесть миров, которых в каталоге оформления нет, — а Soft и Poster, из
 * которых мастер выбирает везде, в ней не было вовсе.
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
    <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-bg">
      <header className="flex flex-col gap-3 px-5 pb-8 pt-10 text-center lg:pt-16">
        <h1 className="font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-[0.9] text-ink">
          {t.studio.galleryTitle}
        </h1>
        <p className="mx-auto max-w-[46ch] text-sm leading-relaxed text-ink-soft">
          {t.studio.galleryText}
        </p>
      </header>

      {archived ? (
        <div className="mx-auto mb-6 w-full max-w-3xl px-5">
          <div className="card p-5">
            <p className="text-[15px] text-ink">{t.studio.archiveTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {fmt(t.studio.archiveText, { style: nearest.name })}
            </p>
          </div>
        </div>
      ) : null}

      {/* Образцы стоят вплотную, разделённые волосяной линией: в системе
          каждый блок в собственной рамке — дефект (§2.0, закон 4). */}
      <div className="mx-auto mb-10 grid w-full max-w-3xl gap-px border-y border-border bg-border sm:grid-cols-2">
        {OFFERED_DESIGN_KEYS.map((key) => {
          const candidate = applyStyle(design, key);
          const copy = designCopy(key, t);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChoose(candidate)}
              className="press flex cursor-pointer flex-col gap-2 bg-bg-raised p-4 text-left hover:bg-bg-sunken"
            >
              <WorldThumbnail design={candidate} height={260} />
              <span className="px-1 pb-1">
                <span className="block text-[15px] text-ink">{copy.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {copy.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className="sticky bottom-0 mt-auto border-t border-border bg-bg px-5 py-4">
        <Button variant="secondary" className="w-full" onClick={onSkip}>
          {t.studio.gallerySkip}
        </Button>
      </footer>
    </div>
  );
}
