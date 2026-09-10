'use client';

/**
 * Список услуг таблицей — по артборду `ServicesList.dc.html`.
 *
 * Строки сгруппированы категориями, и заголовок группы стоит **внутри**
 * таблицы отдельной строкой: так колонки «Длительность» и «Цена» остаются
 * одной вертикалью на весь список, и мастер сравнивает цены между
 * категориями, не пересчитывая глазами.
 *
 * Цвет категории — точка перед её именем. Он же красит запись в календаре,
 * поэтому здесь он не украшение, а легенда к другому экрану.
 */
import { Fragment } from 'react';

import { serviceTone } from '@/features/dashboard-home/service-tone';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { Service } from '../types';

export interface ServiceGroupRow {
  id: string;
  name: string;
  color: string | null;
  hidden: boolean;
  showHeading: boolean;
  services: Service[];
}

export function ServicesTable({
  groups,
  onEdit,
  onDelete,
}: {
  groups: ServiceGroupRow[];
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
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
    <div className="card bookings-table">
      <table className="table">
        <thead>
          <tr>
            <th>{t.services.colService}</th>
            <th style={{ width: 130 }}>{t.services.colDuration}</th>
            <th style={{ width: 110 }}>{t.services.colPrice}</th>
            {/* Колонки «Дополнения» из макета здесь нет: список услуг их не
                знает — они приходят отдельным запросом на каждую услугу, и
                колонка стоила бы стольких запросов, сколько строк. Появится
                вместе с числом дополнений в ответе списка. */}
            <th style={{ width: 48 }} />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.id}>
              {group.showHeading ? (
                <tr className="services-group">
                  <td colSpan={4}>
                    <span className="row" style={{ gap: 10 }}>
                      <span
                        className="services-dot"
                        style={{ background: group.color ?? 'var(--muted-2)' }}
                        aria-hidden="true"
                      />
                      <span style={{ fontWeight: 600 }}>{group.name}</span>
                      <span className="t-meta">
                        {fmt(t.services.countLabel, { count: group.services.length })}
                      </span>
                      {group.hidden ? (
                        <span className="badge b-neutral">{t.services.hiddenFromClients}</span>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ) : null}

              {group.services.map((service) => (
                /*
                 * Строка открывается нажатием, как строка записи.
                 *
                 * Услуга открывалась только через «⋮» у правого края: человек
                 * нажимал на название и не получал ничего. Одна и та же
                 * таблица кабинета вела себя по-разному в двух разделах, и
                 * догадаться, что здесь работает только меню, было неоткуда.
                 */
                <tr
                  key={service.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onEdit(service)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onEdit(service);
                    }
                  }}
                >
                  <td data-label="" style={{ whiteSpace: 'normal' }}>
                    <span className="row" style={{ gap: 8 }}>
                      {/*
                       * Тон услуги, а не категории. Календарь красит визиты
                       * именно им, и до сих пор его нигде не было видно рядом
                       * с названием: соответствие «зелёная карточка — это
                       * стрижка» мастер выводила сама. Точка категории стоит
                       * в заголовке группы и отвечает на другой вопрос, а у
                       * мастера без категорий её не было вовсе.
                       */}
                      <span
                        className="services-dot"
                        style={{ background: serviceTone(service.id) }}
                        aria-hidden="true"
                      />
                      <span style={{ fontWeight: 500 }}>{service.name}</span>
                      {!service.isActive ? (
                        <span className="badge b-neutral">{t.services.hidden}</span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label={t.services.colDuration}>
                    {duration(service.durationMinutes)}
                    {/* Буфер — часть следа визита в календаре, и без него
                        «75 мин» обещает полтора часа, которых у мастера нет. */}
                    {service.bufferAfterMinutes ? (
                      <span className="t-meta">
                        {' '}
                        + {service.bufferAfterMinutes} {t.common.minuteShort}
                      </span>
                    ) : null}
                  </td>
                  <td data-label={t.services.colPrice} style={{ fontWeight: 600 }}>
                    {service.priceType === 'from' ? `${t.common.from} ` : ''}
                    {formatPrice(service.priceAmount, service.priceCurrency, locale)}
                  </td>
                  <td
                    data-label=""
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
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
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      {groups.length === 0 ? (
        <div className="bookings-empty">
          <Icon name="services" className="ico-24" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t.services.emptyServices}</span>
        </div>
      ) : null}
    </div>
  );
}
