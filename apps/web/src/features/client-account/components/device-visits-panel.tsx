'use client';

import Link from 'next/link';

import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import { useDeviceVisits } from '../use-device-memory';

/**
 * «Записи на этом устройстве» — то, что человек видит на `/me`.
 *
 * Самый короткий путь к своим визитам: с телефона, которым записывались, они
 * открываются сразу — почта и письмо нужны ровно тогда, когда устройство
 * другое. Список читается из браузера, поэтому и появляется после
 * монтирования: на сервере этой памяти нет.
 *
 * `except` — токены визитов, которые экран уже показал сам. Панель стоит и
 * у вошедшего человека: гостевая запись в кабинет не попадает (мастер,
 * открывшая чужую страницу, и тот, кто записывал не себя, — тому примеры), и
 * пока панель показывалась только при отсутствии сессии, такой визит
 * пропадал с «моих визитов» целиком. Повторять то, что уже стоит карточкой
 * выше, при этом незачем.
 */
export function DeviceVisitsPanel({ except = [] }: { except?: readonly string[] }) {
  const t = useT();
  const locale = useLocale();
  const known = new Set(except);
  const visits = useDeviceVisits().filter((visit) => !known.has(visit.token));

  if (visits.length === 0) return null;

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
                  {formatCivilDay(visit.date, locale)}
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
