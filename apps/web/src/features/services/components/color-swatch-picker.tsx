'use client';

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

/**
 * Кружки `.swatches` прототипа «Кабинет 2026»: первый — штриховка «без
 * цвета», выбранный обведён чернилами. Выбор объявлен `aria-pressed`, чтобы
 * нажатость слышала и читалка, а не только видел глаз.
 */
export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const t = useT();
  return (
    <div className="swatches">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label={t.services.noColor}
        aria-pressed={value === null}
        className="swatch swatch--none"
      />
      {SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          aria-label={hex}
          aria-pressed={value === hex}
          style={{ backgroundColor: hex }}
          className={cn('swatch')}
        />
      ))}
    </div>
  );
}
