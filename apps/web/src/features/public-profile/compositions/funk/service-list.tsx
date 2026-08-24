'use client';

import { useMemo, useState } from 'react';

import { formatPrice } from '@/lib/format';
import { useT, type Messages, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ServiceListSectionProps } from '../../contracts/sections';
import { formatDuration } from '../../engine/booking-cart';
import type { PublicService, PublicServiceCategory } from '../../engine/types';
import { ServiceDetailSheet } from '../../shared/service-detail-sheet';

import { BookingFlowSheet } from './booking-sheet';
import { ServiceThumb } from '../../shared/service-thumb';
import { cascade, FOCUS_RING, HEADING_CLASS, PRIMARY_BUTTON_CLASS, STICKER_CLASS } from './ui';

/**
 * Прайс мира FUNK (`brutal.html`, вид `services`): позиции нумерованными
 * блоками, а не строками списка.
 *
 * Каждая позиция — белый блок с чернильным контуром, номером в квадрате и
 * ценой чернильной плашкой с лаймовой цифрой. Каждая третья заливается
 * лаймом целиком: ритм задаётся материалом, а не отступом.
 *
 * Номер — порядковый, а не «размер»: файл ставит там S / M / L, но это
 * свойство его вымышленного прайса, а не продукта. Придумывать мастеру
 * размеры её услуг нельзя, поэтому в квадрате стоит номер позиции.
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const locale = useLocale();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  const [bookingFor, setBookingFor] = useState<PublicService | 'all' | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );

  let position = 0;

  return (
    <section className="px-[18px] pt-2 lg:px-10">
      <div className="anim-funk-pop flex items-center justify-between gap-3 pb-3.5 pt-7">
        <h2 className={HEADING_CLASS}>{t.publicPage.servicesShort}</h2>
        <span className={cn(STICKER_CLASS, 'rotate-[1.5deg] bg-bg-raised')}>
          {String(org.services.length).padStart(2, '0')} {t.publicPage.servicesCount}
        </span>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col">
          {group.name ? (
            <h3 className="pb-2.5 pt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              {`// ${group.name}`}
            </h3>
          ) : null}

          <ul className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-4">
            {group.services.map((service) => {
              const index = position++;
              return (
                <li key={service.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenService(service)}
                    style={cascade(Math.min(index, 8))}
                    className={cn(
                      'anim-funk-pop funk-block funk-press funk-lift flex h-full w-full cursor-pointer items-center gap-3.5 px-[15px] py-4 text-left',
                      FOCUS_RING,
                      /* Каждая третья — лаймовая: ритм материалом. */
                      index % 3 === 1 && 'bg-accent',
                    )}
                  >
                    {/* Снимок вместо номера: номер здесь — украшение ритма, а
                        не сведение, и уступает место фотографии услуги. Угол
                        прямой и контур тот же — скруглений в этом мире нет. */}
                    <ServiceThumb
                      service={service}
                      className="h-[46px] w-[46px] border-2 border-solid border-ink"
                      fallback={
                        <span
                          aria-hidden="true"
                          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center border-2 border-solid border-ink bg-bg font-mono text-[10px] font-bold text-ink"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      }
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-extrabold uppercase tracking-[-0.01em] text-ink">
                        {service.name}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-ink-soft">
                        {formatDuration(service.durationMinutes, t.publicPage)}
                      </span>
                    </span>

                    <span className="shrink-0 whitespace-nowrap bg-ink px-2.5 py-[7px] font-mono text-[13px] font-bold tabular-nums text-accent">
                      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setBookingFor('all')}
        className={cn(PRIMARY_BUTTON_CLASS, 'mt-7 w-full')}
      >
        {t.publicPage.book} →
      </button>

      <p className="mt-8 border-t-2 border-dashed border-ink pt-4 text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
        {t.publicPage.serviceDetails}
      </p>

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
          `initialServiceIds` in `useState`, which only runs on mount. */}
      <BookingFlowSheet
        key={bookingFor === 'all' ? 'all' : (bookingFor?.id ?? 'none')}
        open={Boolean(bookingFor)}
        onOpenChange={(next) => !next && setBookingFor(null)}
        org={org}
        preferredSlot={null}
        initialServiceIds={bookingFor && bookingFor !== 'all' ? [bookingFor.id] : undefined}
        /* Deliberately does nothing: closing here would drop the visitor at
           the price list the instant the booking went through. */
        onBooked={() => undefined}
      />
    </section>
  );
}

interface ServiceGroup {
  id: string;
  name: string;
  services: PublicService[];
}

/**
 * Groups the price list the way the master ordered her categories, with
 * anything uncategorised trailing under «Другие услуги». A service in a
 * hidden category lands in the trailing group rather than disappearing.
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
