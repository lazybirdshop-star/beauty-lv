'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { VisitRow } from '@/features/bookings/components/visit-row';
import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import type { CalendarEntry } from './calendar-grid';
import type { WeekDay } from '../week';

/**
 * Неделя списком — те же строки визита, что на главной (Design System V2 §6):
 * день заголовком, под ним визиты по порядку; нажатие открывает карточку
 * визита здесь же, не уходя с календаря.
 */
export function CalendarAgenda({
  days,
  entries,
  onOpen,
}: {
  days: WeekDay[];
  entries: CalendarEntry[];
  onOpen: (bookingId: string) => void;
}) {
  const locale = useLocale();
  const t = useT();
  const occupied = days.filter((day) => entries.some((entry) => entry.dateKey === day.dateKey));
  if (!occupied.length) return <EmptyState title={t.home.noBookings} />;
  return (
    <div className="calendar-agenda card">
      {occupied.map((day) => (
        <section key={day.dateKey} className="calendar-agenda__day">
          <h2 className="type-title calendar-agenda__title">{formatCivilDay(day.dateKey, locale)}</h2>
          <div className="visit-list">
            {entries
              .filter((entry) => entry.dateKey === day.dateKey)
              .sort((a, b) => a.at - b.at)
              .map((entry) => (
                <VisitRow
                  key={entry.id}
                  startsAt={entry.booking.startsAt}
                  minutes={entry.minutes}
                  clientName={entry.clientName}
                  serviceName={entry.serviceName}
                  tone={entry.tone}
                  status={entry.booking.status}
                  past={day.isPast}
                  onOpen={() => onOpen(entry.id)}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
