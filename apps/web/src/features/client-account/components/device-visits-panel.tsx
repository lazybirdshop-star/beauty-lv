'use client';

import Link from 'next/link';

import { useLocale, useT } from '@/lib/i18n';

import { useDeviceVisits } from '../use-device-memory';

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  /* Дата пришла строкой поясa салона и переводу не подлежит: `UTC` здесь —
     способ ничего с ней не сделать, а не утверждение о часовом поясе. */
  timeZone: 'UTC',
};

/**
 * «Записи на этом устройстве» — то, что человек видит на `/me` до всякого входа.
 *
 * Самый короткий путь к своим визитам: с телефона, которым записывались, они
 * открываются сразу — почта и письмо нужны ровно тогда, когда устройство
 * другое. Список читается из браузера, поэтому и появляется после
 * монтирования: на сервере этой памяти нет.
 */
export function DeviceVisitsPanel() {
  const t = useT();
  const locale = useLocale();
  const visits = useDeviceVisits();

  if (visits.length === 0) return null;

  const dateLabel = new Intl.DateTimeFormat(locale, DATE_OPTS);

  return (
    <section className="flex flex-col gap-3 py-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[20px] leading-tight text-ink">
          {t.clientAccount.onThisDevice}
        </h2>
        <p className="text-xs text-ink-soft">{t.clientAccount.onThisDeviceHint}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {visits.map((visit) => (
          <li key={visit.token}>
            <Link
              href={`/${visit.slug}/booking/${visit.token}`}
              className="press flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-raised px-4 py-3.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-ink">{visit.masterName}</span>
                <span className="truncate text-xs text-ink-soft">
                  {dateLabel.format(new Date(`${visit.date}T00:00:00Z`))}
                </span>
              </span>
              <span className="shrink-0 font-display text-[15px] tabular-nums text-ink">
                {visit.time}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
