'use client';

import { useMemo, useState } from 'react';

import { useT, type Messages } from '@/lib/i18n';

import { formatDuration } from '../../engine/booking-cart';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { BookingFlowSheet } from './booking-sheet';
import { ServiceDetailSheet } from '../../shared/service-detail-sheet';
import type { ServiceListSectionProps } from '../../contracts/sections';
import type { PublicService, PublicServiceCategory } from '../../engine/types';
import { CAPTION_CLASS, PRIMARY_BUTTON_CLASS } from './ui';

/**
 * Прайс мира Luxury («Bergs»): печатный каталог. Шапка полосы — «Услуги»
 * антиквой 28px и код валюты капсом справа, между ними чернильный шов.
 * Строка — номер по каталогу бронзой (01, 02…, сквозная нумерация по
 * порядку мастера), имя 14px, длительность капсом 10px, цена антиквой 22px;
 * строки делят тихие линейки. Группы отмечены капс-метками. Иконок-указателей
 * нет: строка — кнопка целиком, деталь открывается листом. Полосу закрывает
 * бронзовая плита «Записаться» — запись доступна прямо из прайса.
 *
 * С lg каталог раскрывается в две колонки разворота; средник между ними —
 * чернильная линейка (column-rule), номера продолжают сквозной счёт из
 * колонки в колонку, строки не рвутся на переносе (break-inside).
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  /* `'all'` — запись с плиты внизу, без предвыбранной услуги. */
  const [bookingFor, setBookingFor] = useState<PublicService | 'all' | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );
  const currency = org.services[0]?.priceCurrency ?? '';

  /* Сквозной номер по каталогу — в порядке показа групп: страница-то одна,
     нумерация — тоже. */
  const catalogNumbers = useMemo(() => {
    const numbers = new Map<string, string>();
    let position = 0;
    for (const group of groups) {
      for (const service of group.services) {
        position += 1;
        numbers.set(service.id, String(position).padStart(2, '0'));
      }
    }
    return numbers;
  }, [groups]);

  return (
    <section className="px-[18px] pb-10 pt-7 lg:px-8 lg:pb-12 lg:pt-9">
      <div className="flex items-baseline justify-between gap-3 border-b border-border-strong pb-3 lg:pb-4">
        <h2 className="min-w-0 font-display text-[28px] leading-none [font-weight:var(--display-weight)] text-ink lg:text-[36px]">
          {t.publicPage.servicesShort}
        </h2>
        {currency ? <span className={cn('shrink-0', CAPTION_CLASS)}>{currency}</span> : null}
      </div>

      <div className="flex flex-col lg:block lg:columns-2 lg:[column-gap:64px] lg:[column-rule:1px_solid_var(--ink)]">
        {groups.map((group) => (
          <div key={group.id}>
            {group.name ? (
              <h3
                className={cn(
                  /* break-after-avoid прижимает заголовок группы к первой
                     строке — метка не остаётся сиротой внизу колонки. */
                  'break-inside-avoid break-after-avoid border-b border-border pb-3 pt-6',
                  CAPTION_CLASS,
                )}
              >
                {group.name}
              </h3>
            ) : null}

            <ul>
              {group.services.map((service) => {
                const num = catalogNumbers.get(service.id);
                return (
                  <li key={service.id} className="break-inside-avoid">
                    <button
                      type="button"
                      onClick={() => setOpenService(service)}
                      className="luxury-action flex w-full cursor-pointer items-baseline gap-3.5 border-b border-border py-4 text-left hover:bg-bg-sunken/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span className="w-[22px] shrink-0 text-[10px] font-medium tracking-[0.1em] text-accent tabular-nums">
                        {num}
                      </span>

                      {service.imageUrl ? (
                        /* Пример работы — печатный квадрат в тихой линейке,
                           выровнен по строке. */
                        // Masters paste an arbitrary photo URL, so this stays a
                        // plain <img> rather than opening next/image's optimizer
                        // to any host.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={service.imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 shrink-0 self-center border border-border object-cover"
                        />
                      ) : null}

                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-ink">
                          {service.name}
                        </span>
                        <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
                          {formatDuration(service.durationMinutes, t.publicPage)}
                        </span>
                      </span>

                      <span className="shrink-0 whitespace-nowrap font-display text-[22px] tabular-nums [font-weight:var(--display-weight)] text-ink">
                        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setBookingFor('all')}
        className={cn(PRIMARY_BUTTON_CLASS, 'mt-6 w-full')}
      >
        {t.publicPage.book}
      </button>

      <ServiceDetailSheet
        open={Boolean(openService)}
        onOpenChange={(next) => !next && setOpenService(null)}
        service={openService}
        onBook={() => {
          setBookingFor(openService);
          setOpenService(null);
        }}
      />

      {/* Keyed by the subject: the sheet derives its opening step from
          `initialServiceIds` in `useState`, which only runs on mount. Without a
          fresh instance it kept the route it was built with and asked for the
          service the visitor had just picked. */}
      <BookingFlowSheet
        key={bookingFor === 'all' ? 'all' : (bookingFor?.id ?? 'none')}
        open={Boolean(bookingFor)}
        onOpenChange={(next) => !next && setBookingFor(null)}
        org={org}
        preferredSlot={null}
        initialServiceIds={bookingFor && bookingFor !== 'all' ? [bookingFor.id] : undefined}
        /* Deliberately does nothing. Closing the sheet here dropped the
           visitor at the price list the instant the booking went through —
           the confirmation, the calendar file and the status link never got a
           chance to appear. The sheet closes when the person says it does. */
        onBooked={() => undefined}
      />
    </section>
  );
}

interface ServiceGroup {
  id: string;
  /** Empty when there is nothing to group by — the heading is then omitted entirely. */
  name: string;
  services: PublicService[];
}

/**
 * Groups the price list the way the master ordered her categories, with
 * anything uncategorised trailing under «Другие услуги».
 *
 * A service in a hidden category is not dropped — it lands in the trailing
 * group instead. Hiding a category is a statement about the grouping, not
 * about the work: silently deleting services from the public price list
 * would be a far bigger effect than the switch promises.
 */
function groupServices(
  services: PublicService[],
  categories: PublicServiceCategory[],
  t: Messages,
): ServiceGroup[] {
  if (categories.length === 0) {
    return services.length > 0 ? [{ id: 'all', name: '', services }] : [];
  }

  const groups: ServiceGroup[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    services: services.filter((service) => service.categoryId === category.id),
  }));

  const known = new Set(categories.map((category) => category.id));
  const rest = services.filter((service) => !service.categoryId || !known.has(service.categoryId));
  if (rest.length > 0) {
    groups.push({ id: 'rest', name: t.publicPage.otherServices, services: rest });
  }

  return groups.filter((group) => group.services.length > 0);
}
