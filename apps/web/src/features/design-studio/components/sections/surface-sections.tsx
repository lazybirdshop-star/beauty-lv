'use client';

import {
  ACTION_CASES,
  DESIGN_PRESETS,
  FONT_PRESETS,
  MOTION_STEPS,
  styleLimits,
  type ActionCase,
  type ButtonFill,
  type CardMaterial,
  type MotionStep,
  type PageDesign,
} from '@amolie/shared-kernel';

import { fontDescription } from '@/features/organization-profile/preset-copy';
import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { ChoiceRow, ChoiceTile, OwnedByStyle } from './section-shell';

type Preview = (design: PageDesign | null) => void;

interface SectionProps {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: Preview;
}

/* ── §5.7 Кнопки ─────────────────────────────────────────────────────── */

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

/**
 * Характер главного действия: варианты внутри закона стиля, а не свободная
 * форма (DESIGN_STUDIO.md §5.7). Высота 56px, одна primary на экран и
 * состояния — законы продукта, и ручками они не являются: их здесь нет.
 */
export function ButtonsSection({ design, onChange, onPreview }: SectionProps) {
  const t = useT();
  const limits = styleLimits(design.style);

  return (
    <div className="flex flex-col gap-3">
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
      ) : (
        /* Где стиль однозначен (Minimal — только строчные), выбор не показан
           вовсе, а не показан мёртвым. */
        <OwnedByStyle text={t.studio.ownedByStyle} hint={t.studio.ownedByStyleHint} />
      )}
    </div>
  );
}

/* ── §5.8 Карточки ───────────────────────────────────────────────────── */

const MATERIAL_LABEL: Record<CardMaterial, keyof Messages['studio']> = {
  style: 'materialStyle',
  flat: 'materialFlat',
  rule: 'materialRule',
  shadow: 'materialShadow',
  glass: 'materialGlass',
};

/**
 * Материал поверхностей — каталог того, что законно в мире стиля (§5.8).
 * Глубина тени, сила размытия и альфа подложки сюда не выведены: мастер
 * выбирает материал, не физику.
 */
export function CardsSection({ design, onChange, onPreview }: SectionProps) {
  const t = useT();
  const limits = styleLimits(design.style);

  if (limits.materials.length <= 1) {
    return <OwnedByStyle text={t.studio.ownedByStyle} hint={t.studio.ownedByStyleHint} />;
  }

  return (
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
  );
}

/* ── §5.10 Типографика ───────────────────────────────────────────────── */

/**
 * Почерк страницы: не селект с именами, а образцы (§5.10). Имя мастера
 * дисплейной гарнитурой и строка с кириллицей и латышскими диакритиками —
 * два места, где модная гарнитура ломается, показаны до выбора.
 *
 * Шкала кеглей ручкой не является и не станет ею никогда: слайдер размера
 * шрифта — самый короткий путь к уродливой странице из всех существующих.
 */
export function TypographySection({
  design,
  onChange,
  onPreview,
  masterName,
}: SectionProps & { masterName: string }) {
  const t = useT();
  const preset = DESIGN_PRESETS[design.style];

  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

/* ── §5.11 Движение ──────────────────────────────────────────────────── */

const MOTION_LABEL: Record<
  MotionStep,
  { name: keyof Messages['studio']; hint: keyof Messages['studio'] }
> = {
  restrained: { name: 'motionRestrained', hint: 'motionRestrainedHint' },
  live: { name: 'motionLive', hint: 'motionLiveHint' },
  ceremonial: { name: 'motionCeremonial', hint: 'motionCeremonialHint' },
};

/**
 * Интенсивность движения: три ступени, названные характером, а не числами
 * (§5.11). Математика мира — кривая, пружина, словарь жестов — остаётся его
 * собственностью, и «выключить анимацию» не существует: мгновенная смена
 * состояния это антипаттерн А4, а Студия не продаёт антипаттерны.
 */
export function MotionSection({ design, onChange, onPreview }: SectionProps) {
  const t = useT();

  return (
    <ChoiceRow>
      {MOTION_STEPS.map((step) => {
        const next: PageDesign = { ...design, motion: { step } };
        return (
          <ChoiceTile
            key={step}
            label={t.studio[MOTION_LABEL[step].name]}
            hint={t.studio[MOTION_LABEL[step].hint]}
            selected={design.motion.step === step}
            onSelect={() => onChange(next)}
            onPreview={() => onPreview(next)}
            onPreviewEnd={() => onPreview(null)}
          />
        );
      })}
    </ChoiceRow>
  );
}
