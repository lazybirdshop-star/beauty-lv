'use client';

import type { ReactNode } from 'react';

import { StepDoneBadge } from './progress-rail';

interface StepShellProps {
  title: string;
  description: string;
  done: boolean;
  doneLabel: string;
  children: ReactNode;
  /** Shown under the work — «зачем это нужно», never a second heading. */
  footnote?: string;
}

/**
 * Тело шага — `.onb-panel-body` прототипа «Кабинет 2026».
 *
 * Одна рама на все шесть шагов, чтобы переход между ними был перелистыванием
 * страницы, а не приходом в другое место: заголовок, одна честная фраза о
 * том, зачем шаг, и сама работа — ничего между мастером и полем, ради
 * которого она пришла. Ячейку и кнопки «Назад / Дальше» рисует экран.
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
    <div className="onb-step-body">
      {/* Плашка «Готово» — своей строкой над заголовком на любом шаге: в
          строке с ним она то стояла справа, то переносилась под него. */}
      {done ? <StepDoneBadge label={doneLabel} /> : null}
      <h1 className="onb-step-body__title">{title}</h1>
      <p className="onb-step-body__hint">{description}</p>
      <div className="onb-step-body__work">{children}</div>
      {footnote ? <p className="onb-step-body__footnote">{footnote}</p> : null}
    </div>
  );
}
