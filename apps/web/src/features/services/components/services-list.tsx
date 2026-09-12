'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import type { Service } from '../types';
import type { ServiceGroupRow } from './services-table';

/**
 * Услуги списком — по артборду `ServicesMobile.dc.html`.
 *
 * На телефоне таблица раскладывалась в карточку с подписями («Длительность:»,
 * «Цена:»), где слово занимает больше места, чем число. В макете это ряд:
 * название, под ним длительность, справа цена.
 *
 * Заголовок раздела — цветной кружок и имя категории, как в списке категорий:
 * один и тот же цвет ведёт мастера от прайса к странице записи.
 */
export function ServicesList({
  groups,
  onEdit,
}: {
  groups: ServiceGroupRow[];
  /** Без обработчика ряды не открываются — у роли нет права вести прайс. */
  onEdit?: (service: Service) => void;
}) {
  const t = useT();
  const locale = useLocale();

  const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h} ${t.common.hourShort} ${m} ${t.common.minuteShort}`;
    if (h) return `${h} ${t.common.hourShort}`;
    return `${m} ${t.common.minuteShort}`;
  };

  return (
    <div>
      {groups.map((group) => (
        <section key={group.id}>
          {/* Одна группа без имени — это просто список: заголовок из одной
              точки над ним ничего не называет. */}
          {group.showHeading ? (
            <h3 className="t-label services-list__group">
              <span
                className="category-dot is-small"
                style={{ background: group.color ?? 'var(--subtle-2)' }}
              />
              {group.name}
            </h3>
          ) : null}

          {group.services.map((service) => (
            <button
              type="button"
              className="mrow services-list__row"
              key={service.id}
              disabled={!onEdit}
              onClick={onEdit ? () => onEdit(service) : undefined}
            >
              <span className="col" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{service.name}</span>
                <span className="t-meta" style={{ fontSize: 13 }}>
                  {duration(service.durationMinutes)}
                  {service.isActive ? '' : ` · ${t.services.hidden}`}
                </span>
              </span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 600 }}>
                {formatPrice(service.priceAmount, service.priceCurrency, locale)}
              </span>
              {onEdit ? <Icon name="chevR" className="ico-16 chev" /> : null}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
