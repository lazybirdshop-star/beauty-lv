'use client';

import { Check } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

/** Tags for telling services apart at a glance (calendar/list) — independent of the brand accent token. */
const SWATCHES = [
  '#A63A5F',
  '#C97064',
  '#D9A441',
  '#5B8C6E',
  '#3E7C8C',
  '#5B6FA6',
  '#8A5CA6',
  '#6B6B6B',
];

interface ColorSwatchPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="Без цвета"
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
