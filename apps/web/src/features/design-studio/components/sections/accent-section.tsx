'use client';

import {
  ACCENT_CATALOG,
  accentForGround,
  correctAccent,
  deriveAccentPair,
  resolvePageDesignTokens,
  THEME_PRESETS,
  type PageDesign,
} from '@amolie/shared-kernel';
import { Check } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Акцент — цвет действия (DESIGN_STUDIO.md §5.2).
 *
 * Образец здесь не абстрактный кружок, а живая кнопка «Записаться» в этом
 * акценте: мастер выбирает действие, а не HEX. Каталог хранит тон и
 * насыщенность, а светлоту доводит автокоррекция против земли текущего
 * мира — поэтому непроходящего варианта в ряду не лежит по построению.
 *
 * Свой цвет принимается любой: светлота доводится до ближайшей проходящей
 * ступени, и Студия говорит об этом одной спокойной строкой. Информировать,
 * не отчитывать.
 */
export function AccentSection({
  design,
  onChange,
  onPreview,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();
  const [custom, setCustom] = useState(design.accent ?? '');

  /* Земля — та, на которой акцент окажется: своя земля мастера сильнее
     авторской, и мерить надо против неё. */
  const ground =
    design.background.kind === 'color'
      ? design.background.color
      : THEME_PRESETS[design.palette].colors.bg;

  const styleAccent = THEME_PRESETS[design.palette].colors;
  const swatches = useMemo(
    () => ACCENT_CATALOG.map((swatch) => ({ swatch, color: accentForGround(swatch, ground) })),
    [ground],
  );

  const correction = design.accent ? correctAccent(design.accent, ground) : null;
  const corrected = Boolean(correction?.corrected) || Boolean(customCorrected(custom, ground));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <AccentTile
          label={t.studio.accentFromStyle}
          background={styleAccent.accent}
          ink={styleAccent.accentContrast}
          selected={design.accent === null}
          sample={t.studio.accentSample}
          onSelect={() => onChange({ ...design, accent: null })}
          onPreview={() => onPreview({ ...design, accent: null })}
          onPreviewEnd={() => onPreview(null)}
        />

        {swatches.map(({ swatch, color }) => {
          const pair = deriveAccentPair(color, THEME_PRESETS[design.palette].colors, ground);
          const next: PageDesign = { ...design, accent: color };
          return (
            <AccentTile
              key={swatch.key}
              label={swatch.name}
              background={color}
              ink={pair.contrast}
              sample={t.studio.accentSample}
              selected={design.accent === color}
              onSelect={() => onChange(next)}
              onPreview={() => onPreview(next)}
              onPreviewEnd={() => onPreview(null)}
            />
          );
        })}
      </div>

      {/* Свой цвет — один шаг глубже, а не отдельный режим. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-ink-soft">{t.studio.accentOwn}</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={custom || resolvePageDesignTokens(design).colors.accent}
            aria-label={t.studio.accentOwn}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setCustom(value);
              onChange({ ...design, accent: value });
            }}
            className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-bg-raised p-1"
          />
          <Input
            value={custom}
            placeholder="#8C4A2F"
            className="font-mono"
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setCustom(value);
              if (/^#[0-9A-F]{6}$/.test(value)) onChange({ ...design, accent: value });
            }}
          />
        </div>
      </label>

      {corrected ? (
        /* Мастер видит исправленный цвет и одну спокойную строку о том, что
           произошло (§2.2). Не предупреждение — сообщение. */
        <p className="rounded-xl bg-bg-sunken px-3 py-2 text-xs text-ink-soft">
          {t.studio.accentCorrected}
        </p>
      ) : null}
    </div>
  );
}

function customCorrected(value: string, ground: string): boolean {
  if (!/^#[0-9A-F]{6}$/i.test(value)) return false;
  return Boolean(correctAccent(value, ground)?.corrected);
}

function AccentTile({
  label,
  background,
  ink,
  sample,
  selected,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  label: string;
  background: string;
  ink: string;
  sample: string;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={cn(
        'press flex cursor-pointer flex-col items-stretch gap-1 rounded-2xl border-2 p-1.5',
        selected ? 'border-accent' : 'border-border hover:border-border-strong',
      )}
    >
      <span
        aria-hidden="true"
        className="flex min-h-11 items-center justify-center rounded-xl px-2 text-[11px] font-semibold"
        style={{ background, color: ink }}
      >
        {selected ? <Check size={14} weight="bold" /> : sample}
      </span>
      <span className="truncate text-[11px] text-ink-soft">{label}</span>
    </button>
  );
}
