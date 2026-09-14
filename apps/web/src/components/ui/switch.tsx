'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onCheckedChange, disabled, label }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        /*
         * Тумблер прототипа «Кабинет 2026»: дорожка 44×26 без обводки,
         * выключенная — волосяной тон чернил, включённая — сами чернила
         * (`--switch-on`), а не розовый: розовым на экране залито одно
         * действие.
         *
         * Включённое состояние контрастно с запасом — чернила на листе дают
         * 16:1. Выключенная дорожка светлая по рисунку, и контрол очерчивает
         * белый кружок с тенью; состояние несут положение кружка и
         * `aria-checked`, а не одна заливка.
         */
        'relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full bg-[color:var(--border-strong)] p-[3px] transition-colors duration-[var(--dur-press)] ease-[var(--ease-style)] data-[state=checked]:bg-[color:var(--switch-on,var(--accent))]',
        // The track is 44x26, under the 44px minimum for a touch target. The
        // pseudo-element grows the tappable area to 60x44 without moving a
        // pixel of the visual — a wrapping <label> does not help because Radix
        // renders a <button>, which labels do not activate.
        "after:absolute after:-inset-x-2 after:-inset-y-[9px] after:content-['']",
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50',
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <SwitchPrimitive.Thumb className="block h-5 w-5 rounded-full bg-[var(--knob)] shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-[var(--dur-press)] ease-[var(--ease-style)] data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[var(--switch-knob-on,var(--knob))]" />
    </SwitchPrimitive.Root>
  );
}
