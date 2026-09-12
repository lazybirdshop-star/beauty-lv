import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Правило 04 Design System V2: свободное время — розовый предмет, и где есть
 * место, розовая пилюля на нём. Продаваемое время находится по цвету на
 * любом экране.
 *
 * `row` — строка дня («свободно до 13:00 · Открыть») на главной и в списке;
 * `slot` — окно в сетке календаря: кнопка, которая открывает карточку окна.
 * Пилюля внутри окна — визуальная, а не вторая кнопка: нажатие несёт весь
 * предмет, и вложенных кнопок здесь нет.
 * Модуль «Время» — `Card tone="free"`, третьего вида не нужно.
 */
interface FreeTimeRowProps {
  variant: 'row';
  label: ReactNode;
  /** Действие справа — уже кнопка (`Button size="pill"`). */
  action?: ReactNode;
  className?: string;
}

interface FreeTimeSlotProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant: 'slot';
  label: ReactNode;
  /** Слово на пилюле; без него пилюли нет (узкая колонка). */
  pill?: ReactNode;
  /** Окно есть у мастера, но клиенту его не предлагают. */
  hidden?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}

export type FreeTimeProps = FreeTimeRowProps | FreeTimeSlotProps;

export function FreeTime(props: FreeTimeProps) {
  if (props.variant === 'row') {
    return (
      <div className={cn('free-time free-time--row', props.className)}>
        <span className="free-time__label">{props.label}</span>
        {props.action}
      </div>
    );
  }

  const { variant: _variant, label, pill, hidden, icon, className, ...rest } = props;
  return (
    <button
      type="button"
      className={cn('free-time free-time--slot', hidden && 'free-time--hidden', className)}
      {...rest}
    >
      {icon}
      <span className="free-time__label">{label}</span>
      {pill && !hidden ? <span className="free-time__pill">{pill}</span> : null}
    </button>
  );
}
