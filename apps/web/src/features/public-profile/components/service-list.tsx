'use client';

import { CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';

import { formatPrice } from '@/lib/format';

import { ServiceDetailSheet } from './service-detail-sheet';
import type { PublicOrganization, PublicService } from '../types';

export function ServiceList({ org }: { org: PublicOrganization }) {
  const [openService, setOpenService] = useState<PublicService | null>(null);

  return (
    <section className="px-5 pb-12 pt-4">
      <h2 className="mb-1 font-display text-[22px] leading-none text-ink">Услуги и цены</h2>
      <p className="mb-4 text-sm text-ink-soft">Нажмите на услугу, чтобы увидеть подробности</p>

      <ul className="flex flex-col gap-2">
        {org.services.map((service) => (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => setOpenService(service)}
              className="press flex w-full cursor-pointer items-center gap-3 rounded-3xl bg-bg-sunken/70 px-3.5 py-3 text-left hover:bg-bg-sunken"
            >
              {service.imageUrl ? (
                // Masters paste an arbitrary photo URL, so this stays a plain
                // <img> rather than opening next/image's optimizer to any host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                />
              ) : null}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">
                  {service.name}
                </span>
                <span className="block truncate text-sm text-ink-soft">
                  {service.durationMinutes} мин
                  {service.description ? ` · ${service.description}` : ''}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5">
                <span className="font-display text-lg text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
                <CaretRight size={16} weight="bold" className="text-ink-faint" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <ServiceDetailSheet
        open={Boolean(openService)}
        onOpenChange={(next) => !next && setOpenService(null)}
        service={openService}
        bookingHref={`/${org.slug}`}
      />
    </section>
  );
}
