import Link from 'next/link';

import { formatPrice } from '@/lib/format';

import type { PublicOrganization } from '../types';

export function ServiceList({ org }: { org: PublicOrganization }) {
  return (
    <section className="px-5 pb-10 pt-2">
      <h2 className="mb-4 text-lg font-semibold text-ink">Услуги и цены</h2>
      <ul className="flex flex-col gap-3">
        {org.services.map((service) => (
          <li key={service.id}>
            <Link
              href={`/${org.slug}`}
              className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-bg-raised px-4 py-4 shadow-[0_1px_2px_rgba(39,22,32,.04),0_2px_8px_-4px_rgba(39,22,32,.08)] transition-transform active:scale-[0.99]"
            >
              <span>
                <span className="block text-[15px] font-semibold text-ink">{service.name}</span>
                <span className="block text-sm text-ink-faint">{service.durationMinutes} мин</span>
              </span>
              <span className="shrink-0 font-mono text-[15px] font-semibold text-ink">
                {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
