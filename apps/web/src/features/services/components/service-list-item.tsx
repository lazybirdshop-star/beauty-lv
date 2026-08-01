'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';

import type { Service } from '../types';

interface ServiceListItemProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceListItem({ service, onEdit, onDelete }: ServiceListItemProps) {
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
          {!service.isActive ? <Badge tone="neutral">Скрыта</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">
          {service.priceType === 'from' ? 'от ' : ''}
          {formatPrice(service.priceAmount, service.priceCurrency)} · {service.durationMinutes} мин
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-bg-sunken"
        >
          <PencilSimple size={18} />
          <span className="sr-only">Редактировать</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"
        >
          <TrashSimple size={18} />
          <span className="sr-only">Удалить</span>
        </button>
      </div>
    </Card>
  );
}
