'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';

interface ProgressRailProps {
  steps: { key: string; label: string; done: boolean }[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Рельса шагов — по артборду `Onboarding.dc.html`.
 *
 * Где мастер сейчас, что позади и сколько осталось — три вещи, которые
 * многошаговый путь обязан человеку. Подписи под полосками видимые: знать
 * «что дальше», не наводя мышь, важнее пары сэкономленных пикселей.
 *
 * Деления — кнопки, а не украшение: знакомство не мастер-класс с охраной на
 * выходе, и вернуться к адресу, посмотрев на страницу, — нормальное желание.
 */
export function ProgressRail({ steps, currentIndex, onSelect }: ProgressRailProps) {
  return (
    <ol className="rail">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        const className = ['rail__step', step.done ? 'is-done' : '', current ? 'is-current' : '']
          .filter(Boolean)
          .join(' ');

        return (
          <li key={step.key} className={className}>
            <button
              type="button"
              className="rail__button"
              onClick={() => onSelect(index)}
              aria-current={current ? 'step' : undefined}
            >
              <span className="rail__bar" />
              <span className="rail__label">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Галочка рядом с заголовком пройденного шага. */
export function StepDoneBadge({ label }: { label: string }) {
  return (
    <span className="badge b-green">
      <Icon name="check" className="ico-16" />
      {label}
    </span>
  );
}
