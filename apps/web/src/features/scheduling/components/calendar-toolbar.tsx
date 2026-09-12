'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { CalendarView } from '../calendar-columns';

/**
 * Панель календаря — Design System V2 §6: где я, какой вид, два действия.
 *
 * Слева — «Сегодня», ‹ › (белые пилюли с тенью контрола) и подпись того, что
 * нарисовано: в просторном регистре дата набрана антиквой, в плотном — как
 * заголовок экрана. Справа — переключатель вида (`Tabs`, активный поднят),
 * «Рабочее время» и розовая «Новая запись». Шаг стрелок равен тому, что
 * видно: в неделе — неделя, в дне и командном дне — сутки.
 */
export function CalendarToolbar({
  view,
  views,
  onView,
  rangeLabel,
  isToday,
  compact,
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
  /** Показанный день — сегодняшний: подпись «сегодня» рядом с датой. */
  isToday?: boolean;
  /** Плотный регистр — командный день. */
  compact?: boolean;
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
      <div className="cal-toolbar__nav">
        <Button variant="raised" size="sm" onClick={onToday}>
          {t.schedule.today}
        </Button>
        <Button
          variant="raised"
          size="icon"
          aria-label={stepsWeek ? t.schedule.prevWeek : t.schedule.prevDay}
          onClick={onPrev}
        >
          <Icon name="chevL" className="ico-18" />
        </Button>
        <Button
          variant="raised"
          size="icon"
          aria-label={stepsWeek ? t.schedule.nextWeek : t.schedule.nextDay}
          onClick={onNext}
        >
          <Icon name="chevR" className="ico-18" />
        </Button>
        {/* Подпись отвечает за то, что нарисовано: в дневном виде это день,
            а не неделя, внутри которой он лежит. */}
        <div className="cal-range" aria-live="polite">
          <span className={cn(compact ? 'type-page' : 'type-greeting type-greeting--date')}>
            {rangeLabel}
          </span>
          {isToday ? <span className="type-meta">{t.workspace.todayMark}</span> : null}
        </div>
      </div>

      <div className="cal-toolbar__tools">
        {views.length > 1 ? (
          <Tabs value={view} onValueChange={(next) => onView(next as CalendarView)}>
            <TabsList aria-label={t.nav.calendar} className="calendar-views">
              {views.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {labels[item]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <Button variant="raised" size="sm" onClick={onAvailability}>
          <Icon name="clock" className="ico-18" />
          <span>{t.schedule.availability}</span>
        </Button>

        {/* Главное действие календаря — записать человека. Окна живут за
            «Рабочим временем», внутри которого и период. */}
        <Button variant="primary" size="sm" onClick={onNewBooking}>
          <Icon name="plus" className="ico-18" />
          <span>{t.schedule.newBooking}</span>
        </Button>
      </div>
    </div>
  );
}
