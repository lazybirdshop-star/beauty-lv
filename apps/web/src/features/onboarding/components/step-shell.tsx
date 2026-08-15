'use client';

import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

import { StepDoneBadge } from './progress-rail';

interface StepShellProps {
  title: string;
  description: string;
  done: boolean;
  doneLabel: string;
  children: ReactNode;
  /** Shown under the card — «зачем это нужно», never a second heading. */
  footnote?: string;
}

/**
 * One frame for all six steps, so moving between them feels like turning a
 * page rather than arriving somewhere else. Title, one honest sentence about
 * why the step exists, then the actual work — nothing between the master and
 * the field she came to fill.
 */
export function StepShell({
  title,
  description,
  done,
  doneLabel,
  children,
  footnote,
}: StepShellProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[26px] leading-tight text-ink">{title}</h2>
          {done ? <StepDoneBadge label={doneLabel} /> : null}
        </div>
        <p className="text-[15px] leading-relaxed text-ink-soft">{description}</p>
      </div>

      <Card elevation="lead" className="flex flex-col gap-4">
        {children}
      </Card>

      {footnote ? <p className="px-1 text-xs leading-relaxed text-ink-faint">{footnote}</p> : null}
    </div>
  );
}
