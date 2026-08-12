'use client';

import {
  defaultPageDesign,
  DESIGN_PRESETS,
  MOTION_STEPS,
  styleLimits,
  THEME_PRESETS,
  type DesignPresetKey,
  type MotionStep,
  type PageDesign,
  type ThemePresetKey,
} from '@amolie/shared-kernel';

import { Button } from '@/components/ui/button';
import { OFFERED_DESIGN_KEYS } from '@/features/organization-profile/design-worlds';
import { designCopy } from '@/features/organization-profile/preset-copy';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { ChoiceRow, ChoiceTile } from './section-shell';

/**
 * Смена стиля переписывает отправные значения ручек 2–10 своими авторскими,
 * но **паркует** ручные решения мастера, а не стирает их (§5.1): вернулась —
 * они на месте. Поэтому здесь меняются только те грани, которые новый мир не
 * принимает: чужая палитра и чужая пара гарнитур под ним — выбор, результата
 * которого не увидеть.
 */
export function applyStyle(design: PageDesign, style: DesignPresetKey): PageDesign {
  const preset = DESIGN_PRESETS[style];
  const limits = { materials: preset.themePresets, fonts: preset.fontPresets };
  return {
    ...design,
    style,
    palette: limits.materials.includes(design.palette) ? design.palette : preset.defaultThemePreset,
    typography: {
      font: limits.fonts.includes(design.typography.font)
        ? design.typography.font
        : preset.defaultFontPreset,
    },
    /* Материал, регистр и цвет рамки — грани, законные в мире: чужие
       снимаются до авторских, иначе стиль показал бы то, чего в нём не
       бывает. Портрет и фотографии не трогаются: это содержание мастера, а
       не оформление стиля, и мир, который портрета не рисует, всего лишь его
       не показывает. */
    cards: { material: 'style' },
    buttons: { ...design.buttons, case: 'style' },
    border: styleLimits(style).borderColor ? design.border : null,
  };
}

/** Есть ли поверх стиля ручные решения — строка секции обязана это признать. */
export function hasOverrides(design: PageDesign): boolean {
  const authored = defaultPageDesign(design.style);
  return (
    design.accent !== null ||
    design.ink !== null ||
    design.border !== null ||
    design.cards.material !== 'style' ||
    design.buttons.fill !== authored.buttons.fill ||
    design.buttons.case !== 'style' ||
    design.motion.step !== authored.motion.step ||
    design.background.kind !== 'style' ||
    design.typography.font !== authored.typography.font
  );
}

const MOTION_LABEL: Record<
  MotionStep,
  { name: keyof Messages['studio']; hint: keyof Messages['studio'] }
> = {
  restrained: { name: 'motionRestrained', hint: 'motionRestrainedHint' },
  live: { name: 'motionLive', hint: 'motionLiveHint' },
  ceremonial: { name: 'motionCeremonial', hint: 'motionCeremonialHint' },
};

/**
 * Секция стиля: те же живые образы, что и в галерее, только в миниатюре
 * (§5.1). Наведение примеряет мир на холст целиком — решение остаётся за
 * нажатием.
 *
 * Прочтение земли и интенсивность движения живут здесь же: обе — грани мира,
 * а не самостоятельные ручки, и отдельная строка инспектора у каждой из них
 * означала бы два вопроса вместо одного «каким выглядит бизнес».
 */
export function StyleSection({
  design,
  onChange,
  onPreview,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();
  const preset = DESIGN_PRESETS[design.style];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {OFFERED_DESIGN_KEYS.map((key) => {
          const candidate = applyStyle(design, key);
          const selected = design.style === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(candidate)}
              onMouseEnter={() => onPreview(candidate)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(candidate)}
              onBlur={() => onPreview(null)}
              className={cn(
                'press flex cursor-pointer flex-col gap-1.5 rounded-2xl border-2 p-2 text-left',
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <WorldThumbnail design={candidate} height={130} />
              <span className="px-0.5 pb-0.5 text-xs font-semibold text-ink">
                {designCopy(key, t).name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Прочтение земли внутри мира — грань ручки стиля, а не своя ручка. */}
      {preset.themePresets.length > 1 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-soft">{t.studio.stylePalette}</span>
          <div className="grid grid-cols-2 gap-2">
            {preset.themePresets.map((key: ThemePresetKey) => {
              const candidate: PageDesign = { ...design, palette: key };
              const selected = design.palette === key;
              const colors = THEME_PRESETS[key].colors;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(candidate)}
                  onMouseEnter={() => onPreview(candidate)}
                  onMouseLeave={() => onPreview(null)}
                  onFocus={() => onPreview(candidate)}
                  onBlur={() => onPreview(null)}
                  className={cn(
                    'press flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left',
                    selected ? 'border-accent bg-accent-soft' : 'border-border',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ background: colors.accent }}
                    />
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold text-ink">
                    {THEME_PRESETS[key].name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Интенсивность движения: три ступени, названные характером, а не
          числами (§5.11). «Выключить анимацию» не существует — мгновенная
          смена состояния это антипаттерн А4. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-ink-soft">{t.studio.sectionMotion}</span>
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
      </div>

      {hasOverrides(design) ? (
        /* Снять все переопределения одним жестом (§5.1). Медиа не трогается:
           фотографии мастера — её содержание, а не оформление стиля. */
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({
              ...defaultPageDesign(design.style),
              heroPhoto: design.heroPhoto,
              heroVideo: design.heroVideo,
              masterPhoto: design.masterPhoto,
            })
          }
        >
          {t.studio.resetToAuthor}
        </Button>
      ) : null}
    </div>
  );
}
