'use client';

import {
  backgroundRamp,
  CENTER_FOCAL,
  correctGroundForInk,
  THEME_PRESETS,
  type PageDesign,
} from '@amolie/shared-kernel';
import { Check } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { MediaField } from './media-field';

/**
 * Земля страницы: три взаимоисключающих состояния (DESIGN_STUDIO.md §5.5).
 *
 * Взаимоисключающих буквально — переключение режима снимает конкурирующее
 * значение, как и в прежнем редакторе. Держать одновременно свой цвет и своё
 * изображение значит хранить решение, которого не видно, и однажды показать
 * мастеру не то, что она выбирала.
 *
 * Рампа собрана из земли текущего мира, а не из посторонних оттенков: она
 * обязана остаться землёй **этого** стиля. Оттенок, на котором чернь мира
 * перестаёт читаться, в рампу не попадает.
 */
export function BackgroundSection({
  design,
  onChange,
  onPreview,
}: {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();
  const colors = THEME_PRESETS[design.palette].colors;
  const ramp = useMemo(() => backgroundRamp(colors), [colors]);
  const [custom, setCustom] = useState(
    design.background.kind === 'color' ? design.background.color : '',
  );

  const kind = design.background.kind;
  const tabs = [
    { key: 'style' as const, label: t.studio.backgroundStyle },
    { key: 'color' as const, label: t.studio.backgroundColor },
    { key: 'image' as const, label: t.studio.backgroundImage },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-full bg-bg-sunken p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={kind === tab.key}
            onClick={() =>
              onChange({
                ...design,
                background:
                  tab.key === 'style'
                    ? { kind: 'style' }
                    : tab.key === 'color'
                      ? { kind: 'color', color: custom || (ramp[3] ?? colors.bg) }
                      : { kind: 'image', url: '', focal: CENTER_FOCAL },
              })
            }
            className={cn(
              'press min-h-9 flex-1 cursor-pointer rounded-full px-2 text-xs font-semibold',
              kind === tab.key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {kind === 'color' ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            {ramp.map((color) => {
              const next: PageDesign = { ...design, background: { kind: 'color', color } };
              const selected =
                design.background.kind === 'color' && design.background.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={selected}
                  aria-label={color}
                  onClick={() => onChange(next)}
                  onMouseEnter={() => onPreview(next)}
                  onMouseLeave={() => onPreview(null)}
                  onFocus={() => onPreview(next)}
                  onBlur={() => onPreview(null)}
                  className={cn(
                    'press flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2',
                    selected ? 'border-accent' : 'border-border hover:border-border-strong',
                  )}
                  style={{ background: color }}
                >
                  {selected ? (
                    <Check size={14} weight="bold" style={{ color: colors.ink }} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={t.studio.backgroundColor}
              value={design.background.kind === 'color' ? design.background.color : colors.bg}
              onChange={(event) => {
                /* Своя земля чинится тем же механизмом, что и свой акцент:
                   мастер видит исправленный цвет, а не отказ. */
                const color = correctGroundForInk(event.target.value.toUpperCase(), colors);
                setCustom(color);
                onChange({ ...design, background: { kind: 'color', color } });
              }}
              className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-bg-raised p-1"
            />
            <Input
              value={custom}
              placeholder={colors.bg}
              className="font-mono"
              onChange={(event) => {
                const value = event.target.value.toUpperCase();
                setCustom(value);
                if (/^#[0-9A-F]{6}$/.test(value)) {
                  onChange({
                    ...design,
                    background: { kind: 'color', color: correctGroundForInk(value, colors) },
                  });
                }
              }}
            />
          </div>
        </>
      ) : null}

      {kind === 'image' ? (
        <MediaField
          focalLabel={t.studio.mediaFocal}
          media={
            design.background.kind === 'image' && design.background.url
              ? { url: design.background.url, focal: design.background.focal }
              : null
          }
          onChange={(media) =>
            onChange({
              ...design,
              background: media
                ? { kind: 'image', url: media.url, focal: media.focal }
                : { kind: 'image', url: '', focal: CENTER_FOCAL },
            })
          }
        />
      ) : null}
    </div>
  );
}
