'use client';

import { Check } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

interface ProgressRailProps {
  steps: { key: string; label: string; done: boolean }[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Where she is, what is behind her, and how much is left — the three things a
 * multi-step flow owes the person walking it.
 *
 * The segments are buttons, not decoration: setup is not a wizard that holds
 * anyone hostage, and jumping back to the address after seeing what the page
 * looks like is a normal thing to want.
 */
export function ProgressRail({ steps, currentIndex, onSelect }: ProgressRailProps) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        return (
          <li key={step.key} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={current ? 'step' : undefined}
              /* The bar is 6px tall — far under any touch target — so the
                 button keeps a full-height invisible hit area around it. */
              className="group flex h-11 w-full items-center focus-visible:outline-none"
            >
              <span className="sr-only">{step.label}</span>
              <span
                className={cn(
                  'flex h-1.5 w-full items-center justify-center rounded-full transition-colors duration-[var(--dur-press)] group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg',
                  step.done
                    ? 'bg-accent'
                    : current
                      ? 'bg-accent-soft ring-1 ring-accent'
                      : 'bg-border group-hover:bg-border-strong',
                )}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The tick beside a finished step's heading; shared by the rail's siblings. */
export function StepDoneBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <Check size={13} weight="bold" aria-hidden="true" />
      {label}
    </span>
  );
}
