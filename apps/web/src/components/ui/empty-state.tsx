import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Пустое состояние, которое учит: что здесь бывает и что сделать первым.
 *
 * Одна разметка вместо трёх копий (день, записи, календарь): заголовок
 * `.type-strong`, подсказка `.type-meta`, действие — вторичная кнопка от
 * экрана. Без иллюстраций, без рамки — на столе или на поверхности, где
 * стоял бы список.
 */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 py-8', className)}>
      <p className="type-strong text-ink">{title}</p>
      {hint ? <p className="type-meta max-w-[44ch]">{hint}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
