'use client';

import { CalendarPlus } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';

export interface CalendarEvent {
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
}

/** Google хочет событие расписанным в адресе — файла он не читает. */
export function googleCalendarUrl(event: CalendarEvent): string {
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
 * Две дороги в календарь — и обе нужны.
 *
 * `.ics` iOS открывает прямо в «Календаре», и только он умеет принести с
 * собой напоминание; на Android тот же файл приезжает загрузкой, поэтому
 * рядом стоит ссылка Google как короткий путь. Одной кнопкой это не бывает.
 *
 * Живёт отдельно от `BookingFollowup`, потому что то же самое нужно кабинету
 * клиента: подтверждённый визит обязан попадать в календарь и оттуда, а не
 * только с экрана сразу после записи.
 */
export function CalendarLinks({
  slug,
  token,
  event,
  className,
  buttonClassName,
  secondaryClassName,
}: {
  slug: string;
  token: string;
  event: CalendarEvent;
  className?: string;
  buttonClassName: string;
  secondaryClassName: string;
}) {
  const t = useT();

  return (
    <div className={className}>
      <a href={`/${slug}/booking/${token}/calendar.ics`} className={buttonClassName}>
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
    </div>
  );
}
