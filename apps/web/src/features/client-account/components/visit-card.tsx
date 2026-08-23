'use client';

import Link from 'next/link';

import { formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ClientVisit } from '../types';

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/** Три исхода вместо шести статусов: ждём, состоится, не состоится. */
function tone(status: ClientVisit['status']): 'warning' | 'success' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'confirmed' || status === 'completed') return 'success';
  return 'danger';
}

function statusLabel(status: ClientVisit['status'], t: ReturnType<typeof useT>): string {
  switch (status) {
    case 'pending':
      return t.publicPage.statusPending;
    case 'confirmed':
      return t.publicPage.statusConfirmed;
    case 'completed':
      return t.publicPage.statusCompleted;
    case 'no_show':
      return t.publicPage.statusNoShow;
    default:
      return t.publicPage.statusCancelled;
  }
}

/**
 * Один визит в списке клиента.
 *
 * Мастер представлена аватаром и именем — не цветом: у пяти мастеров пять
 * акцентов превратили бы список в конструктор, а мир мастера начинается за
 * ссылкой на её страницу, а не внутри чужого кабинета.
 */
export function VisitCard({ visit, lead = false }: { visit: ClientVisit; lead?: boolean }) {
  const t = useT();
  const locale = useLocale();

  const startsAt = new Date(visit.startsAt);
  const total = visit.items.reduce((sum, item) => sum + item.priceAmountMinorUnits, 0);
  const currency = visit.items[0]?.priceCurrency ?? 'EUR';
  const state = tone(visit.status);

  /* Час и день — в поясе салона: клиент, открывший список в поездке, придёт
     не к тому времени, которое показывает его телефон. */
  const dateLabel = new Intl.DateTimeFormat(locale, {
    ...DATE_OPTS,
    timeZone: visit.master.timeZone,
  }).format(startsAt);

  return (
    <article className={cn('card flex flex-col gap-4', lead ? 'p-6 sm:p-7' : 'p-5')}>
      <div className="flex items-center gap-3">
        {visit.master.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- адрес аватара задаётся мастером ссылкой; объектного хранилища у продукта нет
          <img
            src={visit.master.logoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-[var(--avatar-radius)] object-cover"
          />
        ) : null}
        <Link href={`/${visit.master.slug}`} className="min-w-0 truncate text-[15px] text-ink">
          {visit.master.name}
        </Link>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 rounded-full',
              state === 'warning' && 'bg-warning',
              state === 'success' && 'bg-success',
              state === 'danger' && 'bg-danger',
            )}
          />
          <span className="text-xs text-ink-soft">{statusLabel(visit.status, t)}</span>
        </span>
      </div>

      <div>
        <p className={cn('font-display leading-tight text-ink', lead ? 'text-[26px]' : 'text-xl')}>
          {dateLabel}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {formatTime(startsAt, locale, visit.master.timeZone)} · {visit.durationMinutes}{' '}
          {t.publicPage.minutesShort}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {visit.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink-soft">{item.name}</span>
            <span className="shrink-0 text-sm text-ink">
              {formatPrice(item.priceAmountMinorUnits, item.priceCurrency)}
            </span>
          </li>
        ))}
      </ul>

      {/* Сумма закрывает перечень услуг, а не стоит рядом с действием: строкой
          ниже «повторить визит» она читалась ценой самого повтора. У визита из
          одной услуги её нет вовсе — итог, повторяющий единственную строку,
          заставляет сверять два одинаковых числа. */}
      {visit.items.length > 1 ? (
        <div className="flex justify-end border-t border-border pt-3">
          <span className="font-display text-lg text-ink">{formatPrice(total, currency)}</span>
        </div>
      ) : null}

      <Link
        href={`/${visit.master.slug}`}
        className="press inline-flex min-h-11 w-full items-center justify-center border border-border-strong text-sm text-ink"
      >
        {t.clientAccount.bookAgain}
      </Link>
    </article>
  );
}
