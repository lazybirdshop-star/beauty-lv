'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';

interface ProgressRailProps {
  steps: { key: string; label: string; hint?: string; done: boolean }[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Шаги знакомства — `.onb-steps` прототипа «Кабинет 2026».
 *
 * Где мастер сейчас, что позади и что дальше — три вещи, которые многошаговый
 * путь обязан человеку. Столбец слева от работы: номер в кружке (у пройденного
 * — галочка), название и строка о том, зачем шаг. На телефоне — лента
 * пилюль, у которых название видно только у текущей.
 *
 * Шаги — кнопки, а не украшение: знакомство не мастер-класс с охраной на
 * выходе, и вернуться к адресу, посмотрев на страницу, — нормальное желание.
 * Имя кнопки — название шага; зачем он — её описание.
 */
export function ProgressRail({ steps, currentIndex, onSelect }: ProgressRailProps) {
  return (
    <ol className="onb-steps">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        const className = ['onb-step', step.done ? 'is-done' : '', current ? 'is-current' : '']
          .filter(Boolean)
          .join(' ');
        const hintId = step.hint ? `onb-step-hint-${step.key}` : undefined;

        return (
          <li key={step.key} className={className}>
            <button
              type="button"
              className="onb-step__button"
              onClick={() => onSelect(index)}
              aria-current={current ? 'step' : undefined}
              aria-label={step.label}
              aria-describedby={hintId}
            >
              <i className="onb-step__mark" aria-hidden="true">
                {step.done ? <Icon name="check" className="ico-16" /> : index + 1}
              </i>
              <span className="onb-step__text">
                <b className="onb-step__title">{step.label}</b>
                {step.hint ? (
                  <span className="onb-step__hint" id={hintId}>
                    {step.hint}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Отметка пройденного шага над его заголовком — `.status.ok` прототипа. */
export function StepDoneBadge({ label }: { label: string }) {
  return (
    <span className="onb-done">
      <Icon name="check" className="ico-16" />
      {label}
    </span>
  );
}
