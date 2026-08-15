import { CheckCircle, Circle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { fmt } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { OnboardingStatus, OnboardingStepKey } from '../types';

interface SetupProgressCardProps {
  slug: string;
  status: OnboardingStatus;
  /* A server component, so the dictionary comes down as a prop — `useT` is a
     hook and would turn this into a client component for nothing. */
  t: Messages;
}

function stepTitle(t: Messages, key: OnboardingStepKey): string {
  switch (key) {
    case 'address':
      return t.onboarding.addressShort;
    case 'profile':
      return t.onboarding.profileShort;
    case 'design':
      return t.onboarding.designShort;
    case 'services':
      return t.onboarding.servicesShort;
    case 'schedule':
      return t.onboarding.scheduleShort;
    case 'share':
      return t.onboarding.shareShort;
  }
}

function stepHint(t: Messages, key: OnboardingStepKey): string {
  switch (key) {
    case 'address':
      return t.onboarding.addressHint;
    case 'profile':
      return t.onboarding.profileHint;
    case 'design':
      return t.onboarding.designHintShort;
    case 'services':
      return t.onboarding.servicesHint;
    case 'schedule':
      return t.onboarding.scheduleHint;
    case 'share':
      return t.onboarding.shareHint;
  }
}

/**
 * The thread back into setup, on the screen the master actually opens.
 *
 * Replaces the old three-line checklist, which knew about services, windows
 * and bookings but not about the page itself — so a master could tick every
 * box while her page still carried a machine-made address and no words about
 * her work. Each row is the step it names, not a detour into a settings
 * screen she then has to find her way back from.
 *
 * Disappears the moment setup is finished or dismissed. A permanent checklist
 * becomes furniture.
 */
export function SetupProgressCard({ slug, status, t }: SetupProgressCardProps) {
  if (status.completedAt) return null;

  const doneCount = status.steps.filter((step) => step.done).length;

  return (
    <Card elevation="lead" className="rise flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[26px] leading-none text-ink">{t.onboarding.title}</h2>
        <span className="text-sm tabular-nums text-ink-faint">
          {fmt(t.onboarding.doneOf, { done: doneCount, total: status.steps.length })}
        </span>
      </div>

      <ol className="flex flex-col">
        {status.steps.map((step) => (
          <li key={step.key}>
            <Link
              href={`/${slug}/dashboard/start?step=${step.key}`}
              className={cn(
                'action-motion flex min-h-12 items-center gap-3 border-b border-border py-3',
                step.done ? 'text-ink-faint' : 'hover:bg-bg-sunken',
              )}
            >
              {/* Сделанный шаг помечен зелёной точкой статуса, несделанный —
                  пустым кружком-контуром. Заливок у значков в системе нет. */}
              {step.done ? (
                <CheckCircle size={20} className="shrink-0 text-success" />
              ) : (
                <Circle size={20} className="shrink-0 text-ink-faint" />
              )}
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[15px]', step.done ? 'line-through' : 'text-ink')}>
                  {stepTitle(t, step.key)}
                </span>
                {!step.done ? (
                  <span className="block text-xs text-ink-faint">{stepHint(t, step.key)}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={`/${slug}/dashboard/start`}
          className="action-motion control inline-flex h-12 items-center justify-center bg-accent px-7 text-[15px] text-accent-contrast hover:translate-y-[var(--action-lift,0px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {doneCount === 0 ? t.onboarding.start : t.onboarding.resume}
        </Link>
        <span className="text-[13px] text-ink-faint">{t.onboarding.setupTime}</span>
      </div>
    </Card>
  );
}
