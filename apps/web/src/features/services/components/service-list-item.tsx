'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';

import { useT, useLocale } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
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
  const locale = useLocale();
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
        {/* След визита, а не одна длительность: услуга «75 мин» с буфером 15
            держит полтора часа календаря, и по «75 мин» этого не узнать. */}
        <p className="mt-0.5 text-sm text-ink-soft">
          {service.priceType === 'from' ? `${t.common.from} ` : ''}
          {formatPrice(service.priceAmount, service.priceCurrency, locale)} ·{' '}
          {service.bufferAfterMinutes > 0
            ? fmt(t.services.bufferInList, {
                duration: `${service.durationMinutes} ${t.common.minutesShort}`,
                buffer: `${service.bufferAfterMinutes} ${t.common.minutesShort}`,
              })
            : `${service.durationMinutes} ${t.common.minutesShort}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* Имя услуги — в имени кнопки. Шесть одинаковых пар «Изменить» и
            «Удалить» подряд не называли, что именно они изменят: читалка
            перечисляла двенадцать кнопок с двумя именами на всех. На
            «Расписании» время в имени кнопки есть, и правило то же. */}
        <RowAction
          label={fmt(t.services.editNamed, { name: service.name })}
          icon={<PencilSimple size={18} />}
          onClick={onEdit}
        />
        <RowAction
          label={fmt(t.services.deleteNamed, { name: service.name })}
          icon={<TrashSimple size={18} />}
          tone="danger"
          onClick={onDelete}
        />
      </div>
    </Card>
  );
}
