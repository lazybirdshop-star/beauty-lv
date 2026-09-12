'use client';

import { Check } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Тона услуг Design System V2 — тёплые и взрослые, не леденцы: dusty rose,
 * sage, clay, slate. Независимы от акцента бренда; прежде выбранные цвета
 * продолжают храниться и рисоваться как есть.
 */
const SWATCHES = ['#C2748A', '#6E8F72', '#B5714B', '#5E7192'];

interface ColorSwatchPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label={t.services.noColor}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border-strong text-ink-faint',
          value === null && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-raised',
        )}
      >
        <Check size={14} className={cn(value === null ? 'opacity-100' : 'opacity-0')} />
      </button>
      {SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          aria-label={hex}
          style={{ backgroundColor: hex }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            value === hex && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-raised',
          )}
        >
          <Check
            size={14}
            weight="bold"
            className={cn('text-white', value === hex ? 'opacity-100' : 'opacity-0')}
          />
        </button>
      ))}
    </div>
  );
}
