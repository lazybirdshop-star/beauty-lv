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
 * Поверхность кабинета — ячейка прототипа «Кабинет 2026»: белый лист на
 * столе, радиус `--card-radius`, волосяная рамка и тень. Поля 20 по
 * вертикали и `--pad-surface-x` (22) по горизонтали, на телефоне 14.
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
        elevation === 'lead'
          ? 'p-6 sm:p-[var(--pad-surface-lead,1.75rem)]'
          : 'px-[var(--pad-surface-x,var(--pad-surface,1.25rem))] py-[var(--pad-surface,1.25rem)]',
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
    <div className={cn('mb-3.5 flex items-start justify-between gap-3', className)} {...props} />
  );
}

/**
 * Заголовок ячейки — `.cell-head h2` прототипа «Кабинет 2026»: 15/500.
 * Своим классом, а не `type-title`: у той роли 18 px, и утилита кегля
 * рядом с ней проигрывала.
 */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  /* `h2`, а не `h3`: карточка — раздел экрана, и заголовок страницы — `h1`.
     С `h3` читалка объявляла пропуск уровня на каждом экране кабинета, а
     переход по заголовкам — её способ осмотреть страницу целиком. */
  return <h2 className={cn('card-title', className)} {...props} />;
}

/** Строка-подсказка под заголовком модуля — всегда есть, всегда тихая. */
export function CardHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('type-meta mt-1 text-xs text-ink-faint', className)} {...props} />;
}
