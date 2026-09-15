'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';

import type { CalendarView } from '../calendar-columns';

/**
 * Панель календаря — Design System V2 §6: где я, какой вид, два действия.
 *
 * Строка календаря прототипа «Кабинет 2026» (`.cal-toolbar`): слева
 * «Сегодня» вторичной кнопкой, ‹ › призрачными и подпись того, что
 * нарисовано, — дата антиквой 22 px. Справа — переключатель вида (`Tabs`,
 * активный поднят). Шаг стрелок равен тому, что видно: в неделе — неделя,
 * в дне и командном дне — сутки.
 *
 * «Рабочее время» и «Запись» здесь не живут: это действия экрана, и они
 * стоят в его шапке (`calendar-screen.tsx`), как у прототипа.
 */
export function CalendarToolbar({
  view,
  views,
  onView,
  rangeLabel,
  note,
  filter,
  stepsWeek,
  onToday,
  onPrev,
  onNext,
}: {
  view: CalendarView;
  views: CalendarView[];
  onView: (view: CalendarView) => void;
  rangeLabel: string;
  /** Подпись рядом с датой — «суббота · сегодня». */
  note?: string;
  /** Кого показывать — сегментом справа, перед видами (`.cal-toolbar`). */
  filter?: ReactNode;
  stepsWeek: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const labels: Record<CalendarView, string> = {
    team: t.schedule.viewTeam,
    day: t.schedule.viewDay,
    week: t.schedule.viewWeek,
  };

  return (
    <div className="cal-toolbar">
      <div className="cal-toolbar__nav">
        <Button variant="secondary" size="sm" onClick={onToday}>
          {t.schedule.today}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={stepsWeek ? t.schedule.prevWeek : t.schedule.prevDay}
          onClick={onPrev}
        >
          <Icon name="chevL" className="ico-18" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={stepsWeek ? t.schedule.nextWeek : t.schedule.nextDay}
          onClick={onNext}
        >
          <Icon name="chevR" className="ico-18" />
        </Button>
        {/* Подпись отвечает за то, что нарисовано: в дневном виде это день,
            а не неделя, внутри которой он лежит. */}
        <div className="cal-range" aria-live="polite">
          <span className="type-greeting type-greeting--date">{rangeLabel}</span>
          {note ? <span className="type-meta">{note}</span> : null}
        </div>
      </div>

      <div className="cal-toolbar__tools">
        {filter}
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
      </div>
    </div>
  );
}
