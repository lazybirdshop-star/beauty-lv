import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Заливка ячейки бенто — только у «Финансов», и только до их переезда на
 * Design System V2. В кабинете V2 второй краски нет: обе заливки сведены к
 * розовому тону и нише через `legacy-aliases.css`.
 *
 * @deprecated На главной и в золотом срезе не используется; уйдёт с фазой
 * «Финансы».
 */
export type CellFill = 'rose' | 'lilac';

export function cellFillClass(fill?: CellFill): string | undefined {
  if (fill === 'rose') return 'bg-cell-rose';
  if (fill === 'lilac') return 'bg-cell-lilac';
  return undefined;
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** @deprecated см. `CellFill`. */
  fill?: CellFill;
  /**
   * `lead` — предмет, ради которого открыт экран (ближайший визит на
   * телефоне): поднят сильнее. `flat` — поверхность на столе, одна мягкая тень.
   */
  elevation?: 'flat' | 'lead';
  /**
   * `free` — единственная тонированная поверхность системы: модуль «Время»
   * (правило 04, свободное время розовое).
   */
  tone?: 'default' | 'free';
}

/**
 * Поверхность кабинета: белый предмет на столе, поднятый одной широкой
 * тенью, без рамки. Радиус большой поверхности (`--panel-radius`), поля
 * `--pad-surface`.
 *
 * Поверхность — предмет или модуль, никогда обёртка (handoff §4.1): один
 * модуль главной, лист календаря, карточка визита. Секция внутри неё
 * отделяется воздухом и `.rule`, а не второй карточкой; карточка в карточке
 * — дефект.
 *
 * Форму задаёт класс `.card` из набора кабинета (он же читает токены),
 * поэтому та же разметка остаётся стеклом в мягком мире и плоским полем в
 * плакатном.
 */
export function Card({
  className,
  elevation = 'flat',
  tone = 'default',
  fill,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        elevation === 'lead' ? 'p-6' : 'p-[var(--pad-surface,1.25rem)]',
        cellFillClass(fill),
        className,
      )}
      data-elevation={elevation === 'lead' ? 'lead' : undefined}
      data-tone={tone === 'free' ? 'free' : undefined}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />
  );
}

/** Заголовок модуля — `.type-title`. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('type-title text-ink', className)} {...props} />;
}

/** Строка-подсказка под заголовком модуля — всегда есть, всегда тихая. */
export function CardHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('type-meta mt-1', className)} {...props} />;
}

/**
 * Подпись над данными («Последние действия»). Прописные и разрядка ушли
 * вместе с прежней системой: в V2 ничего не набирается капсом — иерархию
 * несут кегль и тон.
 */
export function CardLabel({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('type-meta', className)} {...props} />;
}
