'use client';

import {
  DESIGN_PRESETS,
  FONT_PRESETS,
  inkRamp,
  resolvePageDesignTokens,
  THEME_PRESETS,
  type PageDesign,
} from '@amolie/shared-kernel';
import { useMemo } from 'react';

import { fontDescription } from '@/features/organization-profile/preset-copy';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { OwnColor, SwatchRow, type Swatch } from './color-field';

/**
 * Текст: почерк страницы и его цвет (DESIGN_STUDIO.md §5.9–5.10).
 *
 * Гарнитура — не селект с именами, а образцы: имя мастера дисплейной парой и
 * строка с кириллицей и латышскими диакритиками, два места, где модная
 * гарнитура ломается, показаны до выбора.
 *
 * Цвет — одно решение, а не три. Приглушённый и бледный оттенки выводятся
 * смешением с землёй и доводятся до нормы резолвером: иерархия текста
 * принадлежит продукту, мастеру принадлежит цвет.
 *
 * Шкала кеглей ручкой не является и не станет ею никогда: слайдер размера
 * шрифта — самый короткий путь к уродливой странице из всех существующих.
 */
export function TextSection({
  design,
  onChange,
  onPreview,
  masterName,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
  masterName: string;
}) {
  const t = useT();
  const preset = DESIGN_PRESETS[design.style];
  const palette = THEME_PRESETS[design.palette].colors;
  const resolved = resolvePageDesignTokens(design);

  const ground = design.background.kind === 'color' ? design.background.color : palette.bg;
  const swatches: Swatch[] = useMemo(
    () => [
      { value: null, color: palette.ink, label: t.studio.inkFromStyle },
      ...inkRamp(palette, ground).map((color) => ({ value: color, color, label: color })),
    ],
    [ground, palette, t.studio.inkFromStyle],
  );

  return (
    <div className="flex flex-col gap-3">
      {preset.fontPresets.map((key) => {
        const font = FONT_PRESETS[key];
        const next: PageDesign = { ...design, typography: { font: key } };
        const selected = design.typography.font === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(next)}
            onMouseEnter={() => onPreview(next)}
            onMouseLeave={() => onPreview(null)}
            onFocus={() => onPreview(next)}
            onBlur={() => onPreview(null)}
            className={cn(
              'press flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left',
              selected
                ? 'border-accent bg-accent-soft'
                : 'border-border hover:border-border-strong',
            )}
          >
            <span
              className="truncate text-lg text-ink"
              style={{ fontFamily: `var(${font.displayVar})` }}
            >
              {masterName}
            </span>
            <span
              className="truncate text-xs text-ink-soft"
              style={{ fontFamily: `var(${font.sansVar})` }}
            >
              Причёска и уход · ā č ē ģ ī ķ ļ ņ š ū ž
            </span>
            <span className="text-[11px] text-ink-faint">
              {font.name} — {fontDescription(key, t)}
            </span>
          </button>
        );
      })}

      <span className="text-xs font-semibold text-ink-soft">{t.studio.inkColor}</span>
      <SwatchRow
        swatches={swatches}
        selected={design.ink}
        checkColor={palette.bg}
        onSelect={(value) => onChange({ ...design, ink: value })}
        onPreview={(value) => onPreview({ ...design, ink: value })}
        onPreviewEnd={() => onPreview(null)}
      />
      <OwnColor
        label={t.studio.inkOwn}
        value={design.ink}
        fallback={resolved.colors.ink}
        onChange={(color) => onChange({ ...design, ink: color })}
      />
      <p className="text-[11px] leading-relaxed text-ink-faint">{t.studio.inkHint}</p>
    </div>
  );
}
