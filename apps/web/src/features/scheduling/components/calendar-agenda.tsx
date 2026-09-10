'use client';

import { DayList } from '@/features/dashboard-home/components/day-list';
import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { CalendarEntry } from './calendar-grid';
import type { WeekDay } from '../week';

export function CalendarAgenda({
  days,
  entries,
  slug,
  timeZone,
}: {
  days: WeekDay[];
  entries: CalendarEntry[];
  slug: string;
  timeZone: string;
}) {
  const locale = useLocale();
  const t = useT();
  const occupied = days.filter((day) => entries.some((entry) => entry.dateKey === day.dateKey));
  if (!occupied.length) return <p className="today-empty">{t.home.noBookings}</p>;
  return (
    <div className="calendar-agenda">
      {occupied.map((day) => (
        <section key={day.dateKey}>
          <h2 className="t-section">{formatCivilDay(day.dateKey, locale)}</h2>
          <DayList
            entries={entries
              .filter((entry) => entry.dateKey === day.dateKey)
              .sort((a, b) => a.at - b.at)
              .map((entry) => ({
                ...entry,
                startsAt: entry.booking.startsAt,
                status: entry.booking.status,
                href: `/${slug}/dashboard/bookings?booking=${entry.id}`,
              }))}
            gaps={[]}
            timeZone={timeZone}
            locale={locale}
          />
        </section>
      ))}
    </div>
  );
}
