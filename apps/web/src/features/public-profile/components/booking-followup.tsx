'use client';

import { CalendarPlus, Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

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

  const statusPath = `/${slug}/booking/${token}`;

  async function copyStatusLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${statusPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={className}>
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

      {/* A confirmed booking has nothing left to wait for, so the link would
          only be one more thing to read. */}
      {awaitingConfirmation ? (
        <button type="button" onClick={copyStatusLink} className={secondaryClassName}>
          {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
          {copied ? t.publicPage.linkCopied : t.publicPage.copyLink}
        </button>
      ) : null}
    </div>
  );
}
