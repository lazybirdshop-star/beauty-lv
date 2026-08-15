import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
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
export function Card({ className, elevation = 'flat', ...props }: CardProps) {
  return (
    <div
      className={cn('card', elevation === 'lead' ? 'p-6 sm:p-7' : 'p-5', className)}
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
