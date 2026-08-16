'use client';

import {
  backgroundRamp,
  correctGroundForInk,
  THEME_PRESETS,
  type PageDesign,
} from '@amolie/shared-kernel';
import { useMemo, useState } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { OwnColor, SwatchRow, type Swatch } from './color-field';
import { MediaField } from './media-field';

/**
 * Земля страницы: цвет или изображение (DESIGN_STUDIO.md §5.5).
 *
 * Взаимоисключающих буквально — переключение режима снимает конкурирующее
 * значение. Держать одновременно свой цвет и своё изображение значит хранить
 * решение, которого не видно, и однажды показать мастеру не то, что она
 * выбирала.
 *
 * **Вкладка — состояние интерфейса, а не решение.** Прежняя версия при
 * переходе на «Изображение» записывала в черновик фон `{kind:'image', url:''}`
 * — пустое изображение, которое сервер честно читал как «земля стиля»:
 * инспектор показывал одно, страница другое, а публикация уезжала с ручкой,
 * которой мастер не двигала. Здесь выбранная вкладка живёт в состоянии
 * компонента, а в черновик попадает только настоящий выбор.
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
  const [tab, setTab] = useState<PageDesign['background']['kind']>(design.background.kind);

  const swatches: Swatch[] = useMemo(
    () =>
      backgroundRamp(colors).map((color) => ({
        value: color,
        color,
        label: color,
      })),
    [colors],
  );

  const tabs = [
    { key: 'style' as const, label: t.studio.backgroundStyle },
    { key: 'color' as const, label: t.studio.backgroundColor },
    { key: 'image' as const, label: t.studio.backgroundImage },
  ];

  function setColor(color: string | null) {
    onChange({
      ...design,
      background: color ? { kind: 'color', color } : { kind: 'style' },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-full bg-bg-sunken p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => {
              setTab(item.key);
              /* Выход на «землю стиля» — решение и уезжает сразу; два других
                 перехода ждут, пока мастер назовёт цвет или ссылку. */
              if (item.key === 'style') onChange({ ...design, background: { kind: 'style' } });
            }}
            className={cn(
              'press min-h-9 flex-1 cursor-pointer rounded-full px-2 text-xs',
              tab === item.key ? 'bg-bg-raised text-ink' : 'text-ink-faint',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'color' ? (
        <>
          <SwatchRow
            swatches={swatches}
            selected={design.background.kind === 'color' ? design.background.color : null}
            checkColor={colors.ink}
            onSelect={setColor}
            onPreview={(color) =>
              onPreview(color ? { ...design, background: { kind: 'color', color } } : null)
            }
            onPreviewEnd={() => onPreview(null)}
          />
          <OwnColor
            label={t.studio.backgroundOwn}
            value={design.background.kind === 'color' ? design.background.color : null}
            fallback={colors.bg}
            /* Своя земля чинится тем же механизмом, что и свой акцент: мастер
               видит исправленный цвет, а не отказ. */
            onChange={(color) => setColor(correctGroundForInk(color, colors))}
          />
        </>
      ) : null}

      {tab === 'image' ? (
        <MediaField
          focalLabel={t.studio.mediaFocal}
          media={
            design.background.kind === 'image'
              ? { url: design.background.url, focal: design.background.focal }
              : null
          }
          onChange={(media) =>
            onChange({
              ...design,
              background: media
                ? { kind: 'image', url: media.url, focal: media.focal }
                : { kind: 'style' },
            })
          }
        />
      ) : null}
    </div>
  );
}
