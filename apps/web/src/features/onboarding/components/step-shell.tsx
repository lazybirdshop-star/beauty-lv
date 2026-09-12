'use client';

import type { ReactNode } from 'react';

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
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        {/* Плашка «Готово» — своей строкой над заголовком на любом шаге: в
            строке с ним она стояла то справа, то переносилась под него — в
            зависимости от длины слова. */}
        {done ? (
          <div className="row">
            <StepDoneBadge label={doneLabel} />
          </div>
        ) : null}
        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>{description}</p>
      </div>

      <div className="card card-lg col" style={{ padding: 24, gap: 18 }}>
        {children}
      </div>

      {footnote ? (
        <p className="t-meta" style={{ marginTop: -14 }}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
