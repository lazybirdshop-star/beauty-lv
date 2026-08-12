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
        'relative h-7 w-12 shrink-0 rounded-full bg-bg-sunken transition-colors duration-[var(--dur-press)] ease-[var(--ease-style)] data-[state=checked]:bg-accent',
        // The track is 48x28 by design, which is under the 44px minimum for a
        // touch target. The pseudo-element grows the tappable area to 64x44
        // without moving a pixel of the visual — a bigger track would be a
        // different-looking switch, and a wrapping <label> does not help
        // because Radix renders a <button>, which labels do not activate.
        "after:absolute after:-inset-x-2 after:-inset-y-2 after:content-['']",
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50',
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-[var(--knob)] shadow-[var(--knob-shadow)] transition-transform duration-[var(--dur-press)] ease-[var(--ease-style)] data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
