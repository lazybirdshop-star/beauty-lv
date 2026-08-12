'use client';

import { Check } from '@phosphor-icons/react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Ряд оттенков и «свой цвет» — один механизм на все цветовые ручки
 * (DESIGN_STUDIO.md §2.1, §5.2).
 *
 * Каталог и свободный ввод повторялись в каждой цветовой секции своими
 * словами: у акцента одна разметка, у земли другая, и добавление третьей
 * ручки означало третью копию, которая разойдётся с первыми двумя на первой
 * же правке. Здесь они написаны один раз, а секция приносит только оттенки и
 * подпись — то, чем ручки действительно отличаются.
 */

export interface Swatch {
  /** Значение решения: HEX или `null` — «как в стиле». */
  value: string | null;
  color: string;
  label: string;
}

export function SwatchRow({
  swatches,
  selected,
  onSelect,
  onPreview,
  onPreviewEnd,
  checkColor,
}: {
  swatches: readonly Swatch[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onPreview: (value: string | null) => void;
  onPreviewEnd: () => void;
  /** Цвет галочки на выбранном образце — чернь того мира, а не продукта. */
  checkColor: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {swatches.map((swatch) => {
        const active = selected === swatch.value;
        return (
          <button
            key={swatch.value ?? 'style'}
            type="button"
            aria-pressed={active}
            aria-label={swatch.label}
            title={swatch.label}
            onClick={() => onSelect(swatch.value)}
            onMouseEnter={() => onPreview(swatch.value)}
            onMouseLeave={onPreviewEnd}
            onFocus={() => onPreview(swatch.value)}
            onBlur={onPreviewEnd}
            className={cn(
              'press flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2',
              active ? 'border-accent' : 'border-border hover:border-border-strong',
            )}
            style={{ background: swatch.color }}
          >
            {active ? <Check size={14} weight="bold" style={{ color: checkColor }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Свой цвет — один шаг глубже, а не отдельный режим.
 *
 * Пипетка и поле ввода держат общее черновое значение: набранное наполовину
 * «#8C4» не является цветом и решением не становится, но и не исчезает из-под
 * пальцев мастера, пока она дописывает.
 */
export function OwnColor({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  /** Текущее решение мастера или `null`, когда цвет принадлежит стилю. */
  value: string | null;
  /** Что показывает пипетка, когда своего цвета нет: цвет мира. */
  fallback: string;
  onChange: (color: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value ?? fallback}
          onChange={(event) => {
            const color = event.target.value.toUpperCase();
            setDraft(color);
            onChange(color);
          }}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-bg-raised p-1"
        />
        <Input
          value={draft}
          placeholder={fallback}
          className="font-mono"
          inputMode="text"
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setDraft(next);
            if (/^#[0-9A-F]{6}$/.test(next)) onChange(next);
          }}
        />
      </div>
    </label>
  );
}

/** Спокойная строка об автокоррекции: информировать, не отчитывать (§2.2). */
export function CorrectionNote({ shown }: { shown: boolean }) {
  const t = useT();
  if (!shown) return null;
  return (
    <p className="rounded-xl bg-bg-sunken px-3 py-2 text-xs text-ink-soft">
      {t.studio.colorCorrected}
    </p>
  );
}
