'use client';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';

import type { CalendarView } from '../calendar-columns';

/**
 * Панель календаря: где я, какой вид, два главных действия.
 *
 * Слева — ответ на «где я»: «Сегодня», шаг назад и вперёд и подпись того, что
 * нарисовано. Справа — вид и действия. Шаг стрелок равен тому, что видно: в
 * неделе — неделя, в дне и командном дне — сутки, иначе стрелка «следующая
 * неделя» над одним вторником перелистывала бы семь дней, не показав шесть.
 */
export function CalendarToolbar({
  view,
  views,
  onView,
  rangeLabel,
  stepsWeek,
  onToday,
  onPrev,
  onNext,
  onAvailability,
  onNewBooking,
}: {
  view: CalendarView;
  views: CalendarView[];
  onView: (view: CalendarView) => void;
  rangeLabel: string;
  stepsWeek: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAvailability: () => void;
  onNewBooking: () => void;
}) {
  const t = useT();
  const labels: Record<CalendarView, string> = {
    team: t.schedule.viewTeam,
    day: t.schedule.viewDay,
    week: t.schedule.viewWeek,
    list: t.workspace.list,
  };

  return (
    <div className="cal-toolbar">
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onToday}>
          {t.schedule.today}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-sm"
          aria-label={stepsWeek ? t.schedule.prevWeek : t.schedule.prevDay}
          onClick={onPrev}
        >
          <Icon name="chevL" className="ico-16" />
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-sm"
          aria-label={stepsWeek ? t.schedule.nextWeek : t.schedule.nextDay}
          onClick={onNext}
        >
          <Icon name="chevR" className="ico-16" />
        </button>
        {/* Подпись отвечает за то, что нарисовано: в дневном виде это день,
            а не неделя, внутри которой он лежит. */}
        <span className="cal-range" aria-live="polite">
          {rangeLabel}
        </span>
      </div>

      <div className="row" style={{ gap: 10 }}>
        {views.length > 1 ? (
          <div className="seg calendar-views" role="group" aria-label={t.nav.calendar}>
            {views.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={view === item}
                className={view === item ? 'is-on' : undefined}
                onClick={() => onView(item)}
              >
                {labels[item]}
              </button>
            ))}
          </div>
        ) : null}

        <button type="button" className="btn btn-secondary" onClick={onAvailability}>
          <Icon name="clock" className="ico-18" />
          <span>{t.schedule.availability}</span>
        </button>

        {/* Главное действие календаря — записать человека. Окна живут за
            «Рабочим временем», внутри которого и период. */}
        <button type="button" className="btn btn-primary" onClick={onNewBooking}>
          <Icon name="plus" className="ico-18" />
          <span>{t.schedule.newBooking}</span>
        </button>
      </div>
    </div>
  );
}
