'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { RowAction } from '@/components/ui/row-action';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';

import type { Service } from '../types';

interface ServiceListItemProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceListItem({ service, onEdit, onDelete }: ServiceListItemProps) {
  const t = useT();
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {service.color ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: service.color }}
              aria-hidden="true"
            />
          ) : null}
          <p className="truncate text-[15px] font-semibold text-ink">{service.name}</p>
          {!service.isActive ? <Badge tone="neutral">{t.services.hidden}</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">
          {service.priceType === 'from' ? `${t.common.from} ` : ''}
          {formatPrice(service.priceAmount, service.priceCurrency)} · {service.durationMinutes}{' '}
          {t.common.minutesShort}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <RowAction label={t.common.edit} icon={<PencilSimple size={18} />} onClick={onEdit} />
        <RowAction
          label={t.common.delete}
          icon={<TrashSimple size={18} />}
          tone="danger"
          onClick={onDelete}
        />
      </div>
    </Card>
  );
}
