'use client';

import {
  ACCENT_CATALOG,
  accentForGround,
  ACTION_CASES,
  correctAccent,
  DESIGN_PRESETS,
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
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        {t.studio.buttonColor}
      </span>

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

      {/*
        Вторая краска акцента — только там, где мир её несёт
        (`STYLE_LIMITS.secondAccent`). Что она делает — дело мира: AURA
        уводит ею градиент действия, FUNK красит тени, метки и «сегодня».
        В мире с одной заливкой второй краске места нет, и ряд не
        показывается вовсе.

        Образец под рядом — живая лента из обоих концов: он честен для
        градиента и читается как «эти две краски рядом» там, где мир кладёт
        их порознь.
      */}
      {limits.secondAccent ? (
        <>
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            {t.studio.accentToColor}
          </span>
          <div className="grid grid-cols-4 gap-2">
            <AccentTile
              label={t.studio.accentFromStyle}
              background={DESIGN_PRESETS[design.style].world?.accentTo ?? palette.accent}
              ink={palette.accentContrast}
              selected={design.accentTo === null}
              onSelect={() => onChange({ ...design, accentTo: null })}
              onPreview={() => onPreview({ ...design, accentTo: null })}
              onPreviewEnd={() => onPreview(null)}
            />

            {swatches.map(({ swatch, color }) => {
              const next: PageDesign = { ...design, accentTo: color };
              return (
                <AccentTile
                  key={swatch.key}
                  label={swatch.name}
                  background={color}
                  ink={resolvePageDesignTokens(next).colors.accentContrast}
                  selected={design.accentTo === color}
                  onSelect={() => onChange(next)}
                  onPreview={() => onPreview(next)}
                  onPreviewEnd={() => onPreview(null)}
                />
              );
            })}
          </div>

          <OwnColor
            label={t.studio.accentToOwn}
            value={design.accentTo}
            fallback={resolved.world.accentTo ?? resolved.colors.accent}
            onChange={(color) => onChange({ ...design, accentTo: color })}
          />

          {/* Образец кнопки — форма её мира, а не форма кабинета: скругление
              берётся из решённых токенов страницы. Ambient `--control-radius`
              на этой поверхности принадлежит кабинету и превратил бы любую
              кнопку в пилюлю, какой бы её ни рисовал выбранный стиль. */}
          <span
            aria-hidden="true"
            className="flex h-11 items-center justify-center text-xs"
            style={{
              borderRadius: resolved.surfaces.controlRadius,
              backgroundImage: `linear-gradient(110deg, ${resolved.colors.accent}, ${
                resolved.world.accentTo ?? resolved.colors.accent
              })`,
              color: resolved.colors.accentContrast,
            }}
          >
            {t.studio.accentSample}
          </span>
        </>
      ) : null}

      {/* Характер заливки — варианты внутри закона стиля (§5.7). Один
          законный вариант это не выбор, а факт мира: ряд с единственной
          плиткой обещал бы решение, которого нет. */}
      {limits.buttonFills.length > 1 ? (
        <>
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            {t.studio.buttonFill}
          </span>
          <ChoiceRow>
            {limits.buttonFills.map((fill) => {
              const next: PageDesign = { ...design, buttons: { ...design.buttons, fill } };
              /* Образец характера заливки собран из решённых токенов самого
                 варианта — той же тройкой `--action-bg/-ink/-edge`, которой
                 рисуется главное действие страницы. Раньше он брал акцент
                 кабинета и показывал мастеру чужой цвет вместо её. */
              const action = resolvePageDesignTokens(next).action;
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
                    className="flex h-8 w-full items-center justify-center border-solid text-[11px]"
                    style={{
                      borderRadius: resolved.surfaces.controlRadius,
                      background: action.bg,
                      color: action.ink,
                      borderWidth: action.edgeWidth,
                      borderColor: action.edge,
                    }}
                  >
                    {t.studio.accentSample}
                  </span>
                </ChoiceTile>
              );
            })}
          </ChoiceRow>
        </>
      ) : null}

      {/* Где стиль однозначен, выбора нет вовсе — а не показан мёртвым (§2.4). */}
      {limits.actionCaseChoice ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            {t.studio.buttonCase}
          </span>
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
        'press relative flex min-h-11 cursor-pointer items-center justify-center border border-border',
        !selected && 'hover:border-border-strong',
      )}
      style={{ background }}
    >
      {selected ? (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-accent" />
          <Check size={14} weight="bold" style={{ color: ink }} />
        </>
      ) : null}
    </button>
  );
}
