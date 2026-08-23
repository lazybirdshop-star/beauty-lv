'use client';

import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { useMemo, useState } from 'react';

import { formatPrice } from '@/lib/format';
import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ServiceListSectionProps } from '../../contracts/sections';
import { formatDuration } from '../../engine/booking-cart';
import type { PublicService, PublicServiceCategory } from '../../engine/types';
import { ServiceDetailSheet } from '../../shared/service-detail-sheet';
import { ServiceThumb } from '../../shared/service-thumb';

import { BookingFlowSheet } from './booking-sheet';
import {
  cascade,
  FOCUS_RING_INSET,
  HEADING_CLASS,
  HEADING_NOTE_CLASS,
  PRIMARY_BUTTON_CLASS,
} from './ui';

/**
 * Прайс мира MINIMAL (`minimal.html`, вид `services`): сгруппированный
 * список, а не сетка карточек.
 *
 * Позиции живут внутри одной карточки со скруглением 26px и разделяются
 * волоском — приём системного сгруппированного списка. Отдельная карточка
 * под каждую услугу дала бы девять теней там, где мир хочет одну
 * плоскость.
 *
 * Справа у каждой строки цена и шеврон в круге: строка открывается, и это
 * сказано формой, а не подписью.
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  const [bookingFor, setBookingFor] = useState<PublicService | 'all' | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );

  let position = 0;

  return (
    <section className="px-[22px] pt-2 lg:px-10">
      <div className="anim-minimal-rise flex items-baseline justify-between gap-3 pb-3.5 pt-[30px]">
        <h2 className={HEADING_CLASS}>{t.publicPage.servicesShort}</h2>
        {/* «Услуг: 1», а не «1 Услуг»: подпись — существительное в
            родительном, и число перед ним не согласуется ни в одной форме.
            Тот же порядок стоит на чипах главной — одна строка, один вид. */}
        <span className={HEADING_NOTE_CLASS}>
          {t.publicPage.servicesCount}: {org.services.length}
        </span>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col">
          {group.name ? (
            <h3 className="pb-2.5 pt-4 text-[12.5px] font-semibold tracking-[-0.01em] text-ink-soft">
              {group.name}
            </h3>
          ) : null}

          <ul className="min-card anim-minimal-rise flex flex-col overflow-hidden">
            {group.services.map((service) => {
              const index = position++;
              return (
                <li key={service.id} className="min-w-0 [&+li]:border-t [&+li]:border-border">
                  <button
                    type="button"
                    onClick={() => setOpenService(service)}
                    style={cascade(Math.min(index, 8))}
                    className={cn(
                      'min-press flex w-full cursor-pointer items-center gap-3.5 px-5 py-[18px] text-left active:bg-bg-sunken',
                      FOCUS_RING_INSET,
                    )}
                  >
                    {/* Ведущего места у строки не было вовсе — снимок его и
                        занимает. Нет снимка — нет и места: мир не заводит
                        подложек ради выравнивания. */}
                    <ServiceThumb
                      service={service}
                      className="h-12 w-12 rounded-[var(--card-radius)]"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold tracking-[-0.015em] text-ink">
                        {service.name}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] tracking-[-0.01em] text-ink-soft">
                        {formatDuration(service.durationMinutes, t.publicPage)}
                      </span>
                    </span>

                    <span className="shrink-0 whitespace-nowrap text-[15px] font-bold tracking-[-0.02em] tabular-nums text-ink">
                      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                    </span>

                    <span
                      aria-hidden="true"
                      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-bg-sunken text-ink-soft"
                    >
                      <CaretRight size={11} weight="bold" />
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
        {t.publicPage.book}
      </button>

      <p className="mt-8 text-center text-xs tracking-[-0.01em] text-ink-soft">
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
