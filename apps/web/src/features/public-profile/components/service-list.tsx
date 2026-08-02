import Link from 'next/link';

import { formatPrice } from '@/lib/format';

import type { PublicOrganization } from '../types';

export function ServiceList({ org }: { org: PublicOrganization }) {
  return (
    <section className="px-5 pb-12 pt-4">
      <h2 className="mb-4 font-display text-[22px] leading-none text-ink">Услуги и цены</h2>
      <ul className="flex flex-col gap-2">
        {org.services.map((service) => (
          <li key={service.id}>
            <Link
              href={`/${org.slug}`}
              className="press flex items-center justify-between gap-3 rounded-3xl bg-bg-sunken/70 px-4 py-4 hover:bg-bg-sunken"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-ink">
                  {service.name}
                </span>
                <span className="block text-sm text-ink-faint">{service.durationMinutes} мин</span>
              </span>
              <span className="shrink-0 font-display text-lg text-ink">
                {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
