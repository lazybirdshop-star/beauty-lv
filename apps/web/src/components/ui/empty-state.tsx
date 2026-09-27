import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Пустое состояние, которое учит: что здесь бывает и что сделать первым.
 *
 * Одна разметка вместо трёх копий (день, записи, календарь) — `.empty`
 * прототипа «Кабинет 2026»: по центру, заголовок 15 px, подсказка вторыми
 * чернилами не шире 40 знаков, действие — вторичная кнопка от экрана. Одна
 * в карточке, она занимает карточку, а не обрубок. Стили — в
 * primitives.css, в слое компонентов, чтобы `className` экрана их
 * перебивал.
 */
export function EmptyState({
  title,
  hint,
  action,
  media,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  /**
   * Показ над словами: макет того, что здесь появится.
   *
   * Пустое состояние, которое показывает будущее, убеждает сильнее того,
   * которое его описывает, — но показ не обязателен, и там, где показывать
   * нечего, разметка остаётся прежней.
   */
  media?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('empty-state', className)}>
      {media ? <div className="empty-state__media">{media}</div> : null}
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
