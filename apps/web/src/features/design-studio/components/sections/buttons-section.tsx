'use client';

import {
  ACCENT_CATALOG,
  accentForGround,
  ACTION_CASES,
  correctAccent,
  resolvePageDesignTokens,
  styleLimits,
  THEME_PRESETS,
  type ActionCase,
  type ButtonFill,
  type PageDesign,
} from '@amolie/shared-kernel';
import { Check } from '@phosphor-icons/react';
import { useMemo } from 'react';

import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { CorrectionNote, OwnColor } from './color-field';
import { ChoiceRow, ChoiceTile } from './section-shell';

/**
 * Кнопки: цвет действия и его характер — одна секция (DESIGN_STUDIO.md §5.2,
 * §5.7).
 *
 * Прежде акцент и кнопки стояли двумя строками инспектора, и на вопрос «чем
 * красится кнопка» интерфейс отвечал в двух местах сразу — ровно та путаница,
 * ради которой список ручек и сокращён. Цвет действия и заливка действия —
 * одно решение мастера, принимаемое одним взглядом.
 *
 * Образец — живая кнопка «Записаться» в этом акценте, а не абстрактный
 * кружок: мастер выбирает действие, а не HEX. Каталог хранит тон и
 * насыщенность, светлоту доводит автокоррекция против земли текущего мира,
 * поэтому непроходящего варианта в ряду не лежит по построению.
 *
 * Высота 56px, одна primary на экран и состояния — законы продукта, а не
 * ручки: их здесь нет и не будет.
 */

const FILL_LABEL: Record<ButtonFill, keyof Messages['studio']> = {
  solid: 'buttonSolid',
  outline: 'buttonOutline',
  soft: 'buttonSoft',
};

const CASE_LABEL: Record<ActionCase, keyof Messages['studio']> = {
  style: 'buttonCaseStyle',
  upper: 'buttonCaseUpper',
  lower: 'buttonCaseLower',
};

export function ButtonsSection({
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

  /* Земля — та, на которой акцент окажется: своя земля мастера сильнее
     авторской, и мерить надо против неё. */
  const ground = design.background.kind === 'color' ? design.background.color : palette.bg;

  const swatches = useMemo(
    () => ACCENT_CATALOG.map((swatch) => ({ swatch, color: accentForGround(swatch, ground) })),
    [ground],
  );

  const corrected = Boolean(design.accent && correctAccent(design.accent, ground)?.corrected);
  const resolved = resolvePageDesignTokens(design);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-ink-soft">{t.studio.buttonColor}</span>

      <div className="grid grid-cols-4 gap-2">
        <AccentTile
          label={t.studio.accentFromStyle}
          background={palette.accent}
          ink={palette.accentContrast}
          selected={design.accent === null}
          onSelect={() => onChange({ ...design, accent: null })}
          onPreview={() => onPreview({ ...design, accent: null })}
          onPreviewEnd={() => onPreview(null)}
        />

        {swatches.map(({ swatch, color }) => {
          const next: PageDesign = { ...design, accent: color };
          return (
            <AccentTile
              key={swatch.key}
              label={swatch.name}
              background={color}
              ink={resolvePageDesignTokens(next).colors.accentContrast}
              selected={design.accent === color}
              onSelect={() => onChange(next)}
              onPreview={() => onPreview(next)}
              onPreviewEnd={() => onPreview(null)}
            />
          );
        })}
      </div>

      <OwnColor
        label={t.studio.accentOwn}
        value={design.accent}
        fallback={resolved.colors.accent}
        onChange={(color) => onChange({ ...design, accent: color })}
      />

      <CorrectionNote shown={corrected} />

      {/* Характер заливки — варианты внутри закона стиля (§5.7). */}
      <span className="text-xs font-semibold text-ink-soft">{t.studio.buttonFill}</span>
      <ChoiceRow>
        {limits.buttonFills.map((fill) => {
          const next: PageDesign = { ...design, buttons: { ...design.buttons, fill } };
          return (
            <ChoiceTile
              key={fill}
              label={t.studio[FILL_LABEL[fill]]}
              selected={design.buttons.fill === fill}
              onSelect={() => onChange(next)}
              onPreview={() => onPreview(next)}
              onPreviewEnd={() => onPreview(null)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-[var(--control-radius)] text-[11px] font-semibold',
                  fill === 'solid' && 'bg-accent text-accent-contrast',
                  fill === 'outline' && 'border border-border-strong text-ink',
                  fill === 'soft' && 'bg-accent-soft text-accent',
                )}
              >
                {t.studio.accentSample}
              </span>
            </ChoiceTile>
          );
        })}
      </ChoiceRow>

      {/* Где стиль однозначен, выбора нет вовсе — а не показан мёртвым (§2.4). */}
      {limits.actionCaseChoice ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-soft">{t.studio.buttonCase}</span>
          <ChoiceRow>
            {ACTION_CASES.map((value) => {
              const next: PageDesign = { ...design, buttons: { ...design.buttons, case: value } };
              return (
                <ChoiceTile
                  key={value}
                  label={t.studio[CASE_LABEL[value]]}
                  selected={design.buttons.case === value}
                  onSelect={() => onChange(next)}
                  onPreview={() => onPreview(next)}
                  onPreviewEnd={() => onPreview(null)}
                />
              );
            })}
          </ChoiceRow>
        </div>
      ) : null}
    </div>
  );
}

function AccentTile({
  label,
  background,
  ink,
  selected,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  label: string;
  background: string;
  ink: string;
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
      title={label}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={cn(
        'press flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2',
        selected ? 'border-accent' : 'border-border hover:border-border-strong',
      )}
      style={{ background }}
    >
      {selected ? <Check size={14} weight="bold" style={{ color: ink }} /> : null}
    </button>
  );
}
