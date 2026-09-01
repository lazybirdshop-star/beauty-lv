'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { CalendarLinks } from '@/features/public-profile/shared/calendar-links';
import { REPEAT_SERVICES_PARAM } from '@/features/public-profile/engine/repeat-booking';

import { cancelClientVisit, rescheduleClientVisit } from '../api';
import type { ClientVisit } from '../types';
import { CancelVisit } from './cancel-visit';
import { RescheduleVisit } from './reschedule-visit';

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
    case 'expired':
      return t.publicPage.statusExpired;
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
  const router = useRouter();

  const startsAt = new Date(visit.startsAt);
  /* Срок считает сервер и присылает моментом, а не правилом: у браузера часы
     могут врать, но кнопка, показанная зря, честнее кнопки, которой нет, —
     отказ придёт словами, а не молчанием. */
  /* Повтор ведёт на страницу мастера с прошлой корзиной в адресе: там запись
     откроется сразу на выборе времени. Услуги, которой больше нет в прайсе,
     страница молча не возьмёт — цену, которую никто не назначал, показывать
     нельзя. */
  const repeatHref =
    visit.serviceIds.length > 0
      ? `/${visit.master.slug}?${REPEAT_SERVICES_PARAM}=${visit.serviceIds.join(',')}`
      : `/${visit.master.slug}`;

  const cancellable =
    visit.cancellableUntil !== null && new Date(visit.cancellableUntil) > new Date();

  /* Прошедшему визиту звонить не о чем: ни переносить, ни отменять уже
     нечего, а телефон под ним читался бы как предложение что-то исправить. */
  const upcoming =
    startsAt > new Date() &&
    visit.status !== 'completed' &&
    visit.status !== 'no_show' &&
    visit.status !== 'expired';

  /*
   * В календарь — только подтверждённый и только предстоящий.
   *
   * Событие на визит, который мастер ещё может отклонить, — обещание, которое
   * продукт не сдержит: забрать его из чужого телефона потом уже нельзя. А
   * прошедшему визиту в календаре места нет вовсе.
   */
  const calendarable = visit.status === 'confirmed' && startsAt > new Date();
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
          {formatTime(startsAt, locale, visit.master.timeZone)} ·{' '}
          {formatDuration(visit.durationMinutes, t.common)}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {visit.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink-soft">{item.name}</span>
            <span className="shrink-0 text-sm text-ink">
              {formatPrice(item.priceAmountMinorUnits, item.priceCurrency, locale)}
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
          <span className="font-display text-lg text-ink">
            {formatPrice(total, currency, locale)}
          </span>
        </div>
      ) : null}

      {calendarable ? (
        <CalendarLinks
          slug={visit.master.slug}
          token={visit.publicToken}
          event={{
            title: `${visit.items.map((item) => item.name).join(', ')} — ${visit.master.name}`,
            startsAt: visit.startsAt,
            durationMinutes: visit.durationMinutes,
            location: visit.master.address,
          }}
          className="flex flex-col gap-2"
          /* `control` — не украшение: в нём живёт `--control-radius`, и без
             него ссылки, собранные из классов вручную, выходили прямоугольными
             рядом с пилюлей «Отменить визит», которая берёт форму у `Button`. */
          buttonClassName="control press inline-flex min-h-11 w-full items-center justify-center gap-2 bg-accent text-sm font-semibold text-accent-contrast"
          secondaryClassName="control press inline-flex min-h-11 w-full items-center justify-center gap-2 border border-border-strong text-sm text-ink"
        />
      ) : null}

      <Link
        href={repeatHref}
        className="control press inline-flex min-h-11 w-full items-center justify-center border border-border-strong text-sm text-ink"
      >
        {t.clientAccount.bookAgain}
      </Link>

      {cancellable ? (
        <>
          {/* Перенос перед отменой: у человека, у которого изменились планы,
              первое желание — прийти в другой час, а не не прийти вовсе. */}
          <RescheduleVisit
            slug={visit.master.slug}
            durationMinutes={visit.durationMinutes}
            timeZone={visit.master.timeZone}
            reschedule={(slotId) => rescheduleClientVisit(visit.id, slotId)}
            onRescheduled={() => router.refresh()}
            buttonClassName="w-full"
          />
          <CancelVisit
            cancel={() => cancelClientVisit(visit.id)}
            onCancelled={() => router.refresh()}
            buttonClassName="w-full"
          />
        </>
      ) : null}

      {/* Когда своей отмены нет — а по умолчанию её нет, — кабинет не
          предлагал ничего: ни фразы, ни номера, хотя страница записи их
          показывает. Пока кнопка отмены на экране, звонить предлагается ради
          переноса: «отменить — по телефону» спорило бы с ней в двух
          сантиметрах друг от друга. Та же развилка, что и там. */}
      {upcoming && visit.master.phone ? (
        <p className="text-center text-xs text-ink-soft">
          {cancellable ? t.publicPage.questionsByPhone : t.publicPage.cancelByPhone}{' '}
          <a
            href={`tel:${visit.master.phone.replace(/\s/g, '')}`}
            className="font-semibold text-accent"
          >
            {visit.master.phone}
          </a>
        </p>
      ) : null}
    </article>
  );
}
