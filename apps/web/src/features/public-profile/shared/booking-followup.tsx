'use client';

import { CalendarPlus, Check, Copy } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { useDeviceVisits } from '@/features/client-account/use-device-memory';
import { useT } from '@/lib/i18n';

interface BookingFollowupProps {
  slug: string;
  token: string;
  /** Only a booking still waiting on the master gives the status link a purpose. */
  awaitingConfirmation: boolean;
  /** For the Google path, which wants the event spelled out in the query string. */
  event: { title: string; startsAt: string; durationMinutes: number; location: string };
  /** Poster and soft dress their buttons differently; the behaviour is the same. */
  className?: string;
  buttonClassName: string;
  secondaryClassName: string;
}

function googleCalendarUrl(event: BookingFollowupProps['event']): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const stamp = (date: Date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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

  async function copyStatusLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${statusPath}`);
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
        <button type="button" onClick={copyStatusLink} className={buttonClassName}>
          {copied ? <Check size={18} weight="bold" /> : <Copy size={18} />}
          {copied ? t.publicPage.linkCopied : t.publicPage.copyLink}
        </button>
      ) : (
        <>
          <a href={`${statusPath}/calendar.ics`} className={buttonClassName}>
            <CalendarPlus size={18} weight="fill" />
            {t.publicPage.addToCalendar}
          </a>

          <a
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer noopener"
            className={secondaryClassName}
          >
            {t.publicPage.googleCalendar}
          </a>
        </>
      )}

      {/* Дорога к своим визитам — вместо поисков собственной ссылки. Она же
          дорога к письму: на `/me` под этим списком стоит форма входа, и
          человеку, которому нужны визиты и на другом устройстве, дальше
          одного нажатия идти не придётся. */}
      {savedHere ? (
        <p className="pt-1 text-center text-xs text-ink-soft">
          {t.clientAccount.savedOnThisDevice}{' '}
          <Link href="/me" className="font-semibold text-accent underline underline-offset-2">
            {t.clientAccount.toVisits}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
