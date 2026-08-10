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
import { cascade, FOCUS_RING, LABEL_CLASS, PRIMARY_BUTTON_CLASS } from './ui';

/**
 * Прайс мира Neo Glass (§9, §12): каталог как россыпь стеклянных объектов,
 * а не список строк. Карточка — стекло 20px с кромкой и бликом: имя,
 * длительность капсом и цена дисплейной гарнитурой; пример работы —
 * миниатюра 20px в стеклянной раме, на тёмном стекле такие кадры горят
 * сами. Карточка — кнопка целиком, деталь открывается листом; иконок-
 * указателей нет, потому что объект и так читается нажимаемым.
 *
 * Карточки материализуются каскадом 45ms сверху вниз. С sm каталог
 * раскладывается в две колонки — острова расходятся вширь, а не тянутся
 * одной лентой. Секцию закрывает бирюзовая капсула «Записаться»: запись
 * доступна прямо из прайса.
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  /* `'all'` — запись с нижней капсулы, без предвыбранной услуги. */
  const [bookingFor, setBookingFor] = useState<PublicService | 'all' | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );

  return (
    <section className="flex flex-col gap-3.5 pt-3.5">
      <h2 className="anim-neo-glass-materialize font-display text-[24px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
        {t.publicPage.servicesShort}
      </h2>

      {groups.map((group, groupIndex) => (
        <div key={group.id} className="flex flex-col gap-2.5">
          {group.name ? <h3 className={cn('mt-2', LABEL_CLASS)}>{group.name}</h3> : null}

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {group.services.map((service, index) => (
              <li key={service.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setOpenService(service)}
                  style={cascade(Math.min(groupIndex + index + 1, 8))}
                  className={cn(
                    'anim-neo-glass-materialize neo-glass-pane neo-glass-action neo-glass-lift flex h-full w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] p-3.5 text-left',
                    FOCUS_RING,
                  )}
                >
                  {service.imageUrl ? (
                    /* Пример работы — стеклянная рама 20px со световой
                       кромкой, как фото-поле шапки. */
                    // Masters paste an arbitrary photo URL, so this stays a
                    // plain <img> rather than opening next/image's optimizer
                    // to any host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-[var(--media-radius)] border border-[var(--surface-edge)] object-cover"
                    />
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {service.name}
                    </span>
                    <span className={cn('mt-1.5 block', LABEL_CLASS)}>
                      {formatDuration(service.durationMinutes, t.publicPage)}
                    </span>
                  </span>

                  <span className="shrink-0 whitespace-nowrap font-display text-[17px] tabular-nums [font-weight:var(--display-weight)] text-ink">
                    {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setBookingFor('all')}
        className={cn(PRIMARY_BUTTON_CLASS, 'mt-3 w-full')}
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
