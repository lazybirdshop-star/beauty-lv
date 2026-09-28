'use client';

/**
 * Поле времени кабинета — «06:30» и свой список часов.
 *
 * Пара к полю даты: нативные часы браузера несут глиф операционной системы и
 * рядом с собственным полем даты читаются заплаткой — одна форма из двух
 * разных наборов (критика 2026-09-28). Значение и здесь остаётся `HH:MM`,
 * меняется только то, чем его выбирают.
 *
 * Список, а не колёса: мастер ставит время по своей сетке — половины и
 * четверти часа, — и выбрать из готовых значений быстрее, чем крутить два
 * барабана. Шаг задаёт форма: у окна это полчаса, у визита — четверть.
 */
import { useEffect, useRef } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { cn } from '@/lib/utils';

export interface TimeFieldProps {
  id: string;
  /** `HH:MM`; пусто — поле ещё не заполнено. */
  value: string;
  onChange: (value: string) => void;
  /** Шаг списка в минутах. */
  step?: number;
  /** Раньше этого часа выбирать нечего. */
  min?: string;
  className?: string;
  /** Как называется поле — имя контрола для читалки. */
  label: string;
}

const DAY_MINUTES = 24 * 60;

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function TimeField({
  id,
  value,
  onChange,
  step = 15,
  min,
  className,
  label,
}: TimeFieldProps) {
  const root = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const close = (event: Event) => {
      if (!node.open) return;
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) return;
      node.open = false;
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  const times: string[] = [];
  for (let at = 0; at < DAY_MINUTES; at += Math.max(5, step)) {
    const time = clock(at);
    if (!min || time >= min) times.push(time);
  }

  function pick(time: string) {
    onChange(time);
    if (root.current) root.current.open = false;
  }

  return (
    <details
      className={cn('time-field', className)}
      ref={root}
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        /* Список открывается на выбранном часе, а не на полуночи: сорок
           восемь строк до «13:00» пролистывать незачем. */
        event.currentTarget
          .querySelector<HTMLElement>('.time-field__option.is-on')
          ?.scrollIntoView({ block: 'center' });
        event.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }}
    >
      {/* Имя — словом от формы, по той же причине, что у поля даты. */}
      <summary id={id} className="time-field__button" aria-label={label}>
        <span className="time-field__value tnum">{value || '—'}</span>
        <Icon name="clock" className="ico-16 time-field__icon" />
      </summary>
      {/* Списку своё имя не нужно: его даёт кнопка, которая его открыла, а
          второе такое же имя в форме делало поле неразличимым по подписи. */}
      <div className="popover-surface time-field__panel" role="listbox" aria-labelledby={id}>
        {times.map((time) => (
          <button
            key={time}
            type="button"
            role="option"
            aria-selected={time === value}
            className={cn('time-field__option tnum', time === value && 'is-on')}
            onClick={() => pick(time)}
          >
            {time}
          </button>
        ))}
      </div>
    </details>
  );
}
