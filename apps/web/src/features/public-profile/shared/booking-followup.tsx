'use client';

import { ArrowRight, Check, Copy, ShareNetwork } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';

import { useDeviceVisits } from '@/features/client-account/use-device-memory';
import { fmt } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n';

import { CalendarLinks, type CalendarEvent } from './calendar-links';

/*
 * Умеет ли браузер системный лист «поделиться». Ссылки вынесены наружу
 * компонента, чтобы у стора были стабильные аргументы: `useSyncExternalStore`
 * сравнивает их по ссылке и на новых при каждом рендере подписывался бы заново.
 *
 * Подписки нет намеренно: возможность не меняется, пока страница жива.
 */
const noop = () => {};
const subscribeToNothing = () => noop;
const shareAvailable = () => typeof navigator.share === 'function';
const shareUnavailable = () => false;

interface BookingFollowupProps {
  slug: string;
  token: string;
  /** Only a booking still waiting on the master gives the status link a purpose. */
  awaitingConfirmation: boolean;
  /** For the Google path, which wants the event spelled out in the query string. */
  event: CalendarEvent;
  /** Чей это визит — в подпись отправляемого себе сообщения. */
  masterName: string;
  /** «5 сентября, 14:00» из расписки — туда же. */
  when: string;
  /** Poster and soft dress their buttons differently; the behaviour is the same. */
  className?: string;
  buttonClassName: string;
  secondaryClassName: string;
}

/**
 * What the visitor can do once the booking exists: put it in their own
 * calendar, and — while the master has not answered — keep a way back to find
 * out whether she did.
 *
 * Two calendar paths on purpose. The `.ics` file is the one iOS opens straight
 * into the Calendar app, and it is the only one that can carry an alarm; on
 * Android it arrives as a download, so the Google link is offered beside it as
 * the shorter road. One button cannot be both.
 */
export function BookingFollowup({
  slug,
  token,
  awaitingConfirmation,
  event,
  masterName,
  when,
  className,
  buttonClassName,
  secondaryClassName,
}: BookingFollowupProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  /*
   * Строка о памяти устройства не объявляется, а проверяется: этот же блок
   * стоит и на странице статуса, которую могли открыть с чужого телефона по
   * присланной ссылке. Обещать там «сохранено у вас» было бы неправдой.
   */
  const savedHere = useDeviceVisits().some((visit) => visit.token === token);

  const statusPath = `/${slug}/booking/${token}`;

  /*
   * Подпись кнопки решается до нажатия, а не после: «отправить себе» и
   * «скопировать ссылку» — обещания разных действий, и узнать, какое из них
   * сдержано, нажав, поздно.
   *
   * Через `useSyncExternalStore`, как и память устройства рядом: `navigator`
   * — внешнее для React знание, которого у сервера нет. Он честно отдаёт
   * «поделиться нельзя», клиент подхватывает своё при гидратации, и разметка
   * не расходится ни на одном кадре.
   */
  const canShare = useSyncExternalStore(subscribeToNothing, shareAvailable, shareUnavailable);

  /*
   * Сначала системный лист «поделиться», и только потом буфер обмена.
   *
   * «Скопировать ссылку» требует от человека придумать, куда её деть, и на
   * телефоне это отдельное путешествие по приложениям — поэтому чаще всего
   * ссылку не копировали вовсе, а возвращались с вопросом к мастеру. Лист
   * делает то же самое одним касанием и сам предлагает переписку с собой.
   *
   * Буфер остаётся честной запасной дорогой: `navigator.share` есть не везде,
   * а на настольных браузерах его почти нет.
   */
  async function sendToSelf() {
    const url = `${window.location.origin}${statusPath}`;
    const text = fmt(t.publicPage.shareBookingText, { master: masterName, when });

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        /* Человек закрыл лист — это не сбой, и буфер ему навязывать незачем.
           Отличить отказ от поломки листа нельзя (обе ветки дают одну и ту
           же `AbortError`), а из двух ошибок молчание безобиднее. */
        return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  /*
   * The two offers are mutually exclusive, and on purpose.
   *
   * Nothing goes into anybody's calendar before the master has said yes: an
   * event for a visit she may still decline is a promise the product cannot
   * keep, and no web page can reach back into a phone's calendar to withdraw
   * it. While the answer is pending the only useful thing is the way back to
   * find out. Once it lands, the wait is over and the link has nothing left
   * to say — so it steps aside for the calendar.
   */
  return (
    <div className={className}>
      {awaitingConfirmation ? (
        <button type="button" onClick={() => void sendToSelf()} className={buttonClassName}>
          {copied ? (
            <Check size={18} weight="bold" />
          ) : canShare ? (
            <ShareNetwork size={18} />
          ) : (
            <Copy size={18} />
          )}
          {copied
            ? t.publicPage.linkCopied
            : canShare
              ? t.publicPage.shareBooking
              : t.publicPage.copyLink}
        </button>
      ) : (
        <CalendarLinks
          slug={slug}
          token={token}
          event={event}
          className="contents"
          buttonClassName={buttonClassName}
          secondaryClassName={secondaryClassName}
        />
      )}

      {/* Дорога к своим визитам — вместо поисков собственной ссылки. Она же
          дорога к письму: на `/me` под этим списком стоит форма входа, и
          человеку, которому нужны визиты и на другом устройстве, дальше
          одного нажатия идти не придётся.

          Карточкой, а не серой строкой под кнопкой, и это вся правка по
          существу: кабинет клиента упоминался в продукте ровно дважды, оба
          раза мелким шрифтом после уже сделанного действия — и человек о нём
          попросту не знал. Названный своим именем, он и есть ответ на вопрос
          «подтвердили ли мою запись»: там видно все визиты сразу и без
          пароля. */}
      {savedHere ? (
        <Link
          href="/me"
          className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-border px-3.5 py-3 text-left transition-colors hover:border-accent"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">
              {t.clientAccount.allMyVisits}
            </span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {t.clientAccount.allMyVisitsHint}
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-accent" />
        </Link>
      ) : null}
    </div>
  );
}
