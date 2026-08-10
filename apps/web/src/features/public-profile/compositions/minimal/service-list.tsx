'use client';

import { useMemo, useState } from 'react';

import { useT, type Messages } from '@/lib/i18n';

import { formatDuration } from '../../engine/booking-cart';
import { formatPrice } from '@/lib/format';

import { BookingFlowSheet } from './booking-sheet';
import { ServiceDetailSheet } from '../../shared/service-detail-sheet';
import type { ServiceListSectionProps } from '../../contracts/sections';
import type { PublicService, PublicServiceCategory } from '../../engine/types';

/**
 * Прайс мира Minimal (§6): документ, а не витрина. Одна колонка; группы
 * отмечены подписями-метками 11px — единственным капсом мира; карточки
 * белые, 12px, волосяная линейка, ни одной тени; внутренний воздух равен
 * внешнему. Иконок-указателей нет: строка — кнопка целиком, подпись секции
 * говорит об этом словами, а каждая лишняя иконка здесь — шум. Цена —
 * табличная, весом 600: рядом с названием она второй герой строки.
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  const [bookingFor, setBookingFor] = useState<PublicService | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );

  return (
    <section className="pb-16 pt-12">
      <h2 className="font-display text-[20px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
        {t.publicPage.servicesAndPrices}
      </h2>
      <p className="mb-6 mt-2 text-sm text-ink-soft">{t.publicPage.serviceDetails}</p>

      {/* `grid-cols-1` is load-bearing, not noise. Without an explicit track
          the column is implicit and sized `auto`, so it asks its content how
          wide it wants to be — and the row is a flex line whose middle span is
          `flex-1`, which under the flexbox intrinsic-sizing rules reports the
          full un-truncated description. The track resolved to 925px inside a
          348px list and the whole page scrolled sideways on a phone.
          `minmax(0, 1fr)`, which is what this expands to, caps it at the
          container. */}
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2.5">
            {group.name ? (
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
                {group.name}
              </h3>
            ) : null}

            <ul className="grid grid-cols-1 gap-2">
              {group.services.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => setOpenService(service)}
                    className="flex w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] border border-border bg-bg-raised px-4 py-3.5 text-left transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {service.imageUrl ? (
                      // Masters paste an arbitrary photo URL, so this stays a plain
                      // <img> rather than opening next/image's optimizer to any host.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-[var(--media-radius)] object-cover"
                      />
                    ) : null}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">
                        {service.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                        {formatDuration(service.durationMinutes, t.publicPage)}
                        {service.description ? ` · ${service.description}` : ''}
                      </span>
                    </span>

                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ServiceDetailSheet
        open={Boolean(openService)}
        onOpenChange={(next) => !next && setOpenService(null)}
        service={openService}
        onBook={() => {
          setBookingFor(openService);
          setOpenService(null);
        }}
      />

      {/* Keyed by the service: the sheet derives its opening step from
          `initialServiceIds` in `useState`, which only runs on mount. Without a
          fresh instance it kept the route it was built with — empty — and asked
          for the service the visitor had just picked. */}
      <BookingFlowSheet
        key={bookingFor?.id ?? 'none'}
        open={Boolean(bookingFor)}
        onOpenChange={(next) => !next && setBookingFor(null)}
        org={org}
        preferredSlot={null}
        initialServiceIds={bookingFor ? [bookingFor.id] : undefined}
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
