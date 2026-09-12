'use client';

import type { CSSProperties, ReactNode } from 'react';

import { formatDuration, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Строка услуги в визите: точка в тоне услуги, имя, длительность тихо,
 * цена табличными цифрами справа. Одна и та же в панели визита (чтение) и
 * в форме записи (со слотом действия справа).
 */
export function ServiceLine({
  name,
  minutes,
  price,
  currency,
  tone,
  action,
  className,
}: {
  name: string;
  minutes: number;
  price: number;
  currency: string;
  tone?: string | null;
  action?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className={cn('service-line', className)}>
      <span
        className="service-line__dot"
        aria-hidden="true"
        style={tone ? ({ '--tone': tone } as CSSProperties) : undefined}
      />
      <span className="service-line__name">{name}</span>
      <span className="service-line__meta type-meta">
        {formatDuration(minutes, {
          hoursShort: t.common.hoursShort,
          minutesShort: t.common.minutesShort,
        })}
      </span>
      <span className="service-line__price tnum">{formatPrice(price, currency, locale)}</span>
      {action}
    </div>
  );
}
