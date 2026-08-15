'use client';

import { Heart, Warning } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ClientFlag } from '../types';

/**
 * One marker, one look, everywhere it appears.
 *
 * The clients list used to render it as a bare 10px coloured dot while the
 * bookings list rendered a labelled badge — the same fact told two ways, and
 * the dot told it by colour alone, which is exactly what a master with any
 * colour-vision deficiency cannot read. Icon plus word plus colour: three
 * channels, so losing one still leaves the meaning.
 *
 * Метку несёт сам значок, а не точка статуса `Badge`: у флага клиента уже есть
 * своя форма, и точка рядом с сердцем была бы вторым маркером об одном и том
 * же. Обводка без заливки — в системе заливок у значков нет.
 */
export function ClientFlagBadge({ flag }: { flag: ClientFlag }) {
  const t = useT();
  if (!flag) return null;

  const attention = flag === 'attention';
  const Icon = attention ? Warning : Heart;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-ink-soft">
      <Icon
        size={13}
        aria-hidden="true"
        className={cn('shrink-0', attention ? 'text-danger' : 'text-success')}
      />
      {attention ? t.clients.flagAttention : t.clients.flagFavourite}
    </span>
  );
}
