'use client';

import { CheckCircle, HourglassMedium, Prohibit } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { cancelGuestBooking } from '@/features/client-account/api';
import { CancelVisit } from '@/features/client-account/components/cancel-visit';
import { RememberVisit } from '@/features/client-account/components/remember-visit';
import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { PublicBooking } from '../engine/booking-status';
import type { PublicOrganization } from '../engine/types';
import { BookingFollowup } from './booking-followup';

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * The answer to «did she accept me?», on a page the visitor can return to.
 *
 * It is the whole reason the booking carries a token: with no client accounts
 * there is nothing else that could tell one guest's booking from another's,
 * and until this page existed a person who closed the tab had no way at all of
 * finding out what the master decided.
 */
export function BookingStatusCard({
  org,
  booking,
  token,
  soft,
}: {
  org: PublicOrganization;
  booking: PublicBooking;
  token: string;
  /** Poster and soft carry the same facts in different surfaces. */
  soft: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const startsAt = new Date(booking.startsAt);
  /* Отменить может только тот, кому мастер это разрешила и кто успел в срок.
     Момент считает сервер: часы устройства решают здесь слишком много. */
  const cancellable =
    booking.cancellableUntil !== null && new Date(booking.cancellableUntil) > new Date();
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountMinorUnits, 0);
  const currency = booking.items[0]?.priceCurrency ?? 'EUR';

  const state =
    booking.status === 'pending'
      ? ({ tone: 'warning', label: t.publicPage.statusPending, Icon: HourglassMedium } as const)
      : booking.status === 'confirmed'
        ? ({ tone: 'success', label: t.publicPage.statusConfirmed, Icon: CheckCircle } as const)
        : booking.status === 'completed'
          ? ({ tone: 'success', label: t.publicPage.statusCompleted, Icon: CheckCircle } as const)
          : booking.status === 'no_show'
            ? ({ tone: 'danger', label: t.publicPage.statusNoShow, Icon: Prohibit } as const)
            : ({ tone: 'danger', label: t.publicPage.statusCancelled, Icon: Prohibit } as const);

  const cancelled = state.tone === 'danger';

  return (
    <section className={cn('flex flex-col gap-5 px-5 py-8 lg:px-7', soft ? '' : 'lg:px-8')}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className={cn(
            'flex h-16 w-16 items-center justify-center',
            soft ? 'rounded-full' : '',
            state.tone === 'warning' &&
              (soft ? 'bg-warning-soft text-warning' : 'bg-warning text-bg'),
            state.tone === 'success' &&
              (soft ? 'bg-success-soft text-success' : 'bg-success text-bg'),
            state.tone === 'danger' && (soft ? 'bg-danger-soft text-danger' : 'bg-danger text-bg'),
          )}
        >
          <state.Icon size={32} weight="fill" />
        </span>

        <div>
          <h1 className="font-display text-[24px] leading-tight text-ink">{state.label}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {fmt(t.publicPage.dateAtTime, {
              date: new Intl.DateTimeFormat(locale, DATE_OPTS).format(startsAt),
              time: formatTime(startsAt, locale),
            })}
          </p>
          {booking.status === 'pending' ? (
            <p className="mt-2 text-xs text-ink-soft">{t.publicPage.awaitingHint}</p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col gap-1.5 px-4 py-3',
          soft ? 'rounded-2xl bg-bg-sunken/70' : 'border border-border',
        )}
      >
        {booking.items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink-soft">{item.name}</span>
            <span className="shrink-0 text-sm text-ink">
              {formatPrice(item.priceAmountMinorUnits, item.priceCurrency, locale)}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
          <span className="text-sm text-ink-soft">
            {formatDuration(booking.durationMinutes, t.common)}
          </span>
          <span className="font-display text-lg text-ink">
            {formatPrice(total, currency, locale)}
          </span>
        </div>
      </div>

      {/* A cancelled visit has nothing to put in a calendar and nothing left to
          wait for — offering either would be the page arguing with itself. */}
      {cancelled ? null : (
        <BookingFollowup
          slug={org.slug}
          token={token}
          awaitingConfirmation={booking.status === 'pending'}
          event={{
            title: `${booking.items.map((item) => item.name).join(', ')} — ${org.name}`,
            startsAt: booking.startsAt,
            durationMinutes: booking.durationMinutes,
            location: [org.address, org.city].filter(Boolean).join(', '),
          }}
          className="flex flex-col gap-2"
          buttonClassName={cn(
            'press inline-flex min-h-12 w-full items-center justify-center gap-2 bg-accent text-[15px] font-semibold text-accent-contrast',
            soft ? 'rounded-full' : 'uppercase tracking-[0.04em]',
          )}
          secondaryClassName={cn(
            'press inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-border-strong text-sm font-semibold text-ink',
            soft ? 'rounded-full' : '',
          )}
        />
      )}

      {/* Обмен секретной ссылки на почту: по ней визиты найдутся с любого
          устройства и все сразу, а не по одной ссылке на каждый. Отменённой
          записи предлагать нечего — сохранять за собой уже нечего. */}
      {cancelled ? null : (
        <RememberVisit token={token} buttonClassName={cn('w-full', soft ? 'rounded-full' : '')} />
      )}

      {/* Отмена — последней и самой тихой из действий: выход со страницы, а не
          то, ради чего на неё приходят. Выше стоит всё, что визит сохраняет. */}
      {cancellable ? (
        <CancelVisit
          cancel={() => cancelGuestBooking(org.slug, token)}
          onCancelled={() => router.refresh()}
          buttonClassName={cn('w-full', soft ? 'rounded-full' : '')}
        />
      ) : null}

      {org.phone ? (
        <p className="text-center text-xs text-ink-soft">
          {/* Пока кнопка отмены на экране, звонить предлагается ради переноса:
              строка «отменить — по телефону» спорила бы с ней в двух
              сантиметрах друг от друга. */}
          {cancellable ? t.publicPage.rescheduleByPhone : t.publicPage.cancelByPhone}{' '}
          <a href={`tel:${org.phone.replace(/\s/g, '')}`} className="font-semibold text-accent">
            {org.phone}
          </a>
        </p>
      ) : null}
    </section>
  );
}
