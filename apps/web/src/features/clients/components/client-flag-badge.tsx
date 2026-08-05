'use client';

import { Heart, Warning } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

import type { ClientFlag } from '../types';

/**
 * One marker, one look, everywhere it appears.
 *
 * The clients list used to render it as a bare 10px coloured dot while the
 * bookings list rendered a labelled badge — the same fact told two ways, and
 * the dot told it by colour alone, which is exactly what a master with any
 * colour-vision deficiency cannot read. Icon plus word plus colour: three
 * channels, so losing one still leaves the meaning.
 */
export function ClientFlagBadge({ flag }: { flag: ClientFlag }) {
  const t = useT();
  if (!flag) return null;

  const attention = flag === 'attention';
  const Icon = attention ? Warning : Heart;

  return (
    <Badge tone={attention ? 'danger' : 'success'} className="shrink-0 whitespace-nowrap">
      <Icon size={12} weight="fill" aria-hidden="true" />
      {attention ? t.clients.flagAttention : t.clients.flagFavourite}
    </Badge>
  );
}
