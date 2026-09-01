'use client';

import { CaretRight, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { formatCivilDay } from '@/lib/format';
import { fmt } from '@/lib/i18n/messages';
import { useLocale, useT } from '@/lib/i18n';

import { useDeviceVisits } from '../use-device-memory';

/**
 * «У вас здесь уже есть запись» — на самой странице мастера.
 *
 * Ставится ровно там, где человек оказывается, собравшись спросить, подтвердил
 * ли мастер его визит: страницу мастера он открывает первой, потому что через
 * неё и записывался, а Instagram и телефон мастера — рядом на ней же. До этой
 * плашки страница встречала его так, будто он здесь впервые, и единственным
 * видимым способом узнать судьбу заявки оставалось написать самому.
 *
 * Ничего не спрашивает у сервера: дата, час и токен визита лежат в памяти
 * браузера с момента записи. Поэтому плашка ничего и не утверждает о статусе —
 * она обещает не ответ, а дорогу к нему, и за ответом ведёт на страницу визита.
 *
 * Снаружи `CompositionHost`, но в палитре мира: `ThemeStyle` пишет токены на
 * `:root`, а не на обёртку (см. его комментарий), и на публичном маршруте
 * страница мастера — весь документ целиком.
 */
export function VisitReminderBanner({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const visits = useDeviceVisits();

  /*
   * Ближайший из будущих визитов к этому мастеру. `deviceVisits` уже отсеяла
   * прошедшие и хранит их отсортированными по времени добавления, поэтому
   * порядок здесь задаётся заново — по самому визиту, а не по тому, когда о
   * нём узнал браузер.
   */
  const visit = visits
    .filter((saved) => saved.slug === slug)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  if (!visit || hidden) return null;

  /* На странице самого визита плашка была бы указателем на то, что человек
     уже читает. */
  if (pathname === `/${slug}/booking/${visit.token}`) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-30 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-[480px] items-center gap-2 rounded-2xl border border-border bg-bg-raised/95 px-3 py-2 shadow-[0_8px_28px_rgb(0_0_0/0.12)] backdrop-blur">
        <Link
          href={`/${slug}/booking/${visit.token}`}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">
              {t.publicPage.yourBooking}
            </span>
            <span className="block truncate text-xs text-ink-soft">
              {fmt(t.publicPage.dateAtTime, {
                /* Час — из самой памяти, а не из момента: он записан в поясе
                   салона, и `Intl` в браузере клиента увёз бы его в свой. */
                date: formatCivilDay(visit.date, locale),
                time: visit.time,
              })}
            </span>
          </span>
          <CaretRight size={16} className="shrink-0 text-accent" />
        </Link>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label={t.common.close}
          className="shrink-0 p-1 text-ink-faint transition-colors hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
