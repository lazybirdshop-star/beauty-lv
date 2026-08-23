'use client';

import Link from 'next/link';

import { useT } from '@/lib/i18n';

import { visitedMasters } from '../masters';
import type { ClientVisits } from '../types';
import { VisitCard } from './visit-card';

/**
 * Кабинет клиента: один список визитов ко всем мастерам сразу.
 *
 * Раскладка сознательно не повторяет кабинет мастера: у неё шесть разделов,
 * таблицы и календарь, потому что мастер работает здесь каждый день. Клиент
 * заходит четыре раза в год, и всё, что ему нужно, — ближайший визит, история
 * и дорога обратно к мастеру.
 */
export function VisitsScreen({ visits }: { visits: ClientVisits }) {
  const t = useT();
  const masters = visitedMasters(visits);
  const nothing = visits.upcoming.length === 0 && visits.past.length === 0;

  if (nothing) {
    return (
      <section className="flex flex-col items-center gap-2 py-16 text-center">
        <h2 className="font-display text-[22px] leading-tight text-ink">{t.clientAccount.empty}</h2>
        <p className="max-w-prose text-sm text-ink-soft">{t.clientAccount.emptyHint}</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {visits.upcoming.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-ink-faint">{t.clientAccount.upcoming}</h2>
          {visits.upcoming.map((visit, index) => (
            <VisitCard key={visit.id} visit={visit} lead={index === 0} />
          ))}
        </section>
      ) : null}

      {visits.past.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-ink-faint">{t.clientAccount.history}</h2>
          {visits.past.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </section>
      ) : null}

      {/* Зачаток избранного, собранный из того, что человек сделал, а не из
          того, что он отметил звёздочкой. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-ink-faint">{t.clientAccount.myMasters}</h2>
        <ul className="flex flex-wrap gap-2">
          {masters.map((master) => (
            <li key={master.slug}>
              <Link
                href={`/${master.slug}`}
                className="press inline-flex min-h-11 items-center gap-2 border border-border-strong px-4 text-sm text-ink"
              >
                {master.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- адрес аватара задаётся мастером ссылкой; объектного хранилища у продукта нет
                  <img
                    src={master.logoUrl}
                    alt=""
                    className="h-6 w-6 rounded-[var(--avatar-radius)] object-cover"
                  />
                ) : null}
                {master.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
