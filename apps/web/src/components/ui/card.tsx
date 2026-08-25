import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Заливка ячейки бенто.
 *
 * Не украшение, а роль: розовая ячейка говорит о времени и записи, лиловая —
 * об итогах (деньги, ряды за период), белая остаётся рабочей поверхностью со
 * списками, строки которых нажимаются. Цветную ячейку построчно не нажимают,
 * и это само по себе подсказка.
 *
 * Зелёный, янтарный и красный сюда не входят: они заняты статусами визита, и
 * второй смысл на тот же тон вешать нельзя.
 */
export type CellFill = 'rose' | 'lilac';

export function cellFillClass(fill?: CellFill): string | undefined {
  if (fill === 'rose') return 'bg-cell-rose';
  if (fill === 'lilac') return 'bg-cell-lilac';
  return undefined;
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Роль ячейки в бенто — см. `CellFill`. По умолчанию рабочая поверхность. */
  fill?: CellFill;
  /**
   * `lead` — карточка, ради которой открыт экран; `flat` — соседняя в ряду.
   * Разница выражена воздухом, а не тенью: в системе AMOLIE глубину несут
   * тональные ступени поверхностей и отступы. Заодно это выполняет правило
   * «одинаковых отступов у соседних карточек быть не должно».
   */
  elevation?: 'flat' | 'lead';
}

/**
 * Карточка кабинета: тональная поверхность без рамки и без скругления.
 *
 * Форму, фон и (не)наличие рамки задаёт класс `.card` из `globals.css`, он же
 * читает токены мира — поэтому одна и та же разметка остаётся плоским полем в
 * кабинете и может быть чем угодно там, где токены другие.
 */
export function Card({ className, elevation = 'flat', fill, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card',
        elevation === 'lead' ? 'p-6 sm:p-7' : 'p-5',
        cellFillClass(fill),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...props} />
  );
}

/** Единственный заголовочный шаг карточки. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] text-ink', className)} {...props} />;
}

/**
 * Микро-лейбл над данными — подпись к числам и спискам («Последние действия»,
 * «Ваша страница записи»), а не второй заголовок той же карточки. Прописные до
 * 14px — единственное место, где системе разрешён положительный трекинг.
 */
export function CardLabel({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-[12px] uppercase tracking-[0.2em] text-ink-faint', className)}
      {...props}
    />
  );
}
