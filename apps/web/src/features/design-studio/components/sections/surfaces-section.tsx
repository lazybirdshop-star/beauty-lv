'use client';

import {
  backgroundRamp,
  borderRamp,
  resolvePageDesignTokens,
  styleLimits,
  THEME_PRESETS,
  type CardMaterial,
  type PageDesign,
} from '@amolie/shared-kernel';
import { useMemo } from 'react';

import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { OwnColor, SwatchRow, type Swatch } from './color-field';
import { ChoiceRow, ChoiceTile } from './section-shell';

/**
 * Карточки и рамки (DESIGN_STUDIO.md §5.8–5.9).
 *
 * Материал — каталог того, что законно в мире стиля: глубина тени, сила
 * размытия и альфа подложки сюда не выведены, мастер выбирает материал, не
 * физику.
 *
 * Цвет рамки существует только там, где мир несёт границы линейками
 * (`STYLE_LIMITS.borderColor`). В стеклянных мирах границу держат свет и
 * тень, и ручка цвета рамки была бы выбором без результата — а именно этим
 * Студия и запуталась.
 */

const MATERIAL_LABEL: Record<CardMaterial, keyof Messages['studio']> = {
  style: 'materialStyle',
  flat: 'materialFlat',
  rule: 'materialRule',
  shadow: 'materialShadow',
  glass: 'materialGlass',
};

/** Есть ли у мира эта секция вообще: без выбора её не показывают. */
export function hasSurfaceChoices(design: PageDesign): boolean {
  const limits = styleLimits(design.style);
  return limits.materials.length > 1 || limits.borderColor || limits.surfaceTint;
}

export function SurfacesSection({
  design,
  onChange,
  onPreview,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();
  const limits = styleLimits(design.style);
  const palette = THEME_PRESETS[design.palette].colors;
  const resolved = resolvePageDesignTokens(design);

  const ground = design.background.kind === 'color' ? design.background.color : palette.bg;
  const swatches: Swatch[] = useMemo(
    () => [
      { value: null, color: palette.border, label: t.studio.borderFromStyle },
      ...borderRamp(palette, ground).map((color) => ({ value: color, color, label: color })),
    ],
    [ground, palette, t.studio.borderFromStyle],
  );

  /* Стекло мира по умолчанию — плюс восемь ступеней его собственной земли:
     тонировка это сдвиг света, а не смена палитры. */
  const tintSwatches: Swatch[] = useMemo(
    () => [
      { value: null, color: palette.bgRaised, label: t.studio.surfaceTintFromStyle },
      ...backgroundRamp(palette).map((color) => ({ value: color, color, label: color })),
    ],
    [palette, t.studio.surfaceTintFromStyle],
  );

  return (
    <div className="flex flex-col gap-3">
      {limits.materials.length > 1 ? (
        <ChoiceRow>
          {limits.materials.map((material) => {
            const next: PageDesign = { ...design, cards: { material } };
            return (
              <ChoiceTile
                key={material}
                label={t.studio[MATERIAL_LABEL[material]]}
                selected={design.cards.material === material}
                onSelect={() => onChange(next)}
                onPreview={() => onPreview(next)}
                onPreviewEnd={() => onPreview(null)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-8 w-full rounded-[var(--card-radius)] bg-bg-raised',
                    material === 'flat' && 'bg-bg',
                    material === 'rule' && 'border border-border-strong',
                    material === 'shadow' && 'shadow-soft',
                    material === 'glass' && 'border border-border bg-bg-raised/70 backdrop-blur',
                  )}
                />
              </ChoiceTile>
            );
          })}
        </ChoiceRow>
      ) : null}

      {limits.borderColor ? (
        <>
          <span className="text-xs font-semibold text-ink-soft">{t.studio.borderColor}</span>
          <SwatchRow
            swatches={swatches}
            selected={design.border}
            checkColor={palette.bg}
            onSelect={(value) => onChange({ ...design, border: value })}
            onPreview={(value) => onPreview({ ...design, border: value })}
            onPreviewEnd={() => onPreview(null)}
          />
          <OwnColor
            label={t.studio.borderOwn}
            value={design.border}
            fallback={resolved.colors.border}
            onChange={(color) => onChange({ ...design, border: color })}
          />
        </>
      ) : null}

      {/*
        Тон стекла — обратная сторона той же честности, что и цвет рамок:
        там, где границу держит стекло, ручки рамки нет, но есть ручка тона
        самого стекла (`STYLE_LIMITS.surfaceTint`). В мирах с линейками её
        нет: тонировать нечего.

        Каталог — не «любые цвета», а рампа земли текущего мира: стекло это
        свет над землёй, и оттенок, уводящий его в чужой тон, был бы уже не
        тонировкой, а второй палитрой. Норму проходит не сам тинт, а лист,
        который из него получается, — это считает резолвер.
      */}
      {limits.surfaceTint ? (
        <>
          <span className="text-xs font-semibold text-ink-soft">{t.studio.surfaceTint}</span>
          <SwatchRow
            swatches={tintSwatches}
            selected={design.surfaceTint}
            checkColor={palette.ink}
            onSelect={(value) => onChange({ ...design, surfaceTint: value })}
            onPreview={(value) => onPreview({ ...design, surfaceTint: value })}
            onPreviewEnd={() => onPreview(null)}
          />
          <OwnColor
            label={t.studio.surfaceTintOwn}
            value={design.surfaceTint}
            fallback={resolved.world.surfaceTint ?? resolved.colors.bgRaised}
            onChange={(color) => onChange({ ...design, surfaceTint: color })}
          />
          <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.surfaceTintHint}</p>
        </>
      ) : null}
    </div>
  );
}
