'use client';

import type { CSSProperties } from 'react';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { serviceTone } from '@/features/services/service-tone';
import { formatDuration, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { Service } from '../types';

/**
 * Строки прайса — `.svc-row` прототипа «Кабинет 2026».
 *
 * Полоса слева — тон услуги: им же календарь красит визит, и соответствие
 * «зелёная полоса — это стрижка» мастер видит здесь, а не выводит сама.
 * Имя с пометкой «Скрыта», под ним — след визита с буфером; справа —
 * длительность, цена и меню. Одна раскладка на все ширины: на телефоне
 * длительность уходит, остаются имя и цена.
 *
 * Строка открывает услугу нажатием целиком, но кнопка в ней одна — имя,
 * растянутое на всю строку (app.css): меню лежит поверх, и кнопки внутри
 * кнопки не бывает. Без обработчиков строки только показывают прайс — у
 * роли нет права его вести.
 */
export function ServiceRows({
  services,
  onEdit,
  onDelete,
}: {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };

  return (
    <div className={onEdit ? 'svc-rows' : 'svc-rows is-readonly'}>
      {services.map((service) => {
        const duration = formatDuration(service.durationMinutes, units);
        /* След визита, а не одна длительность: «75 мин» с буфером 15 держит
           полтора часа календаря. */
        const footprint = service.bufferAfterMinutes
          ? fmt(t.services.bufferInList, {
              duration,
              buffer: `${service.bufferAfterMinutes} ${t.common.minutesShort}`,
            })
          : duration;
        const price = `${service.priceType === 'from' ? `${t.common.from} ` : ''}${formatPrice(
          service.priceAmount,
          service.priceCurrency,
          locale,
        )}`;

        return (
          <div className="svc-row" key={service.id}>
            <i
              className="svc-row__bar"
              style={{ '--tone': serviceTone(service.id) } as CSSProperties}
              aria-hidden="true"
            />
            <div className="svc-row__text">
              <span className="svc-row__name">
                {onEdit ? (
                  <button type="button" className="svc-row__open" onClick={() => onEdit(service)}>
                    {service.name}
                  </button>
                ) : (
                  <span className="svc-row__title">{service.name}</span>
                )}
                {!service.isActive ? <Badge tone="neutral">{t.services.hidden}</Badge> : null}
              </span>
              <span className="svc-row__meta tnum">{footprint}</span>
            </div>
            <span className="svc-row__dur tnum">{duration}</span>
            <span className="svc-row__price tnum">{price}</span>
            {onEdit && onDelete ? (
              <span className="svc-row__menu">
                <RowMenu label={service.name}>
                  <button type="button" onClick={() => onEdit(service)}>
                    <Icon name="edit" className="ico-16" />
                    <span>{t.common.edit}</span>
                  </button>
                  <button type="button" className="is-danger" onClick={() => onDelete(service)}>
                    <Icon name="trash" className="ico-16" />
                    <span>{t.common.delete}</span>
                  </button>
                </RowMenu>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
