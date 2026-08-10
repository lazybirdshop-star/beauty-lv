'use client';

import Link from 'next/link';

import { useT } from '@/lib/i18n';

import type { PublicBooking } from '../engine/booking-status';
import type { PublicOrganization } from '../engine/types';
import { BookingStatusCard } from '../shared/booking-status-card';

import { useBrandStyleKey } from './composition-context';

/**
 * Хост страницы статуса записи (§14.3): утилитарный экран «факт и действия»,
 * v1 — общий компонент, читающий поверхность рендерящегося мира. Развилка
 * здесь ключевая (`useBrandStyleKey`), а не строковая по `designPresetKey`:
 * для алиасов переходного периода миром является несущая композиция.
 */
export function BookingStatusHost({
  slug,
  org,
  booking,
  token,
}: {
  slug: string;
  org: PublicOrganization;
  booking: PublicBooking | null;
  token: string;
}) {
  const t = useT();
  const panel = useBrandStyleKey() !== 'poster';

  /* Плохой токен и удалённая запись выглядят одинаково намеренно — страница
     не должна становиться способом узнать, существует ли запись. */
  if (!booking) {
    return (
      <section className="flex flex-col items-center gap-3 px-5 py-16 text-center lg:px-7">
        <h1 className="font-display text-[24px] leading-tight text-ink">
          {t.publicPage.bookingNotFound}
        </h1>
        <p className="max-w-prose text-sm text-ink-soft">{t.publicPage.bookingNotFoundHint}</p>
        <Link
          href={`/${slug}`}
          className={`press mt-2 inline-flex min-h-11 items-center px-5 text-sm font-semibold text-ink ${
            panel ? 'rounded-full border border-border-strong' : 'border border-border-strong'
          }`}
        >
          {t.publicPage.toMasterPage}
        </Link>
      </section>
    );
  }

  return <BookingStatusCard org={org} booking={booking} token={token} soft={panel} />;
}
