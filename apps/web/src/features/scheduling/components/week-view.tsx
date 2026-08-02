'use client';

import { CaretLeft, CaretRight, Lock, X } from '@phosphor-icons/react';

import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

import type { WeekDay } from '../week';

interface WeekViewProps {
  days: WeekDay[];
  rangeLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onDeleteSlot: (slotId: string) => void;
  deletingSlotId: string | null;
}

function slotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const NAV_CLASS =
  'press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-bg-sunken/70 text-ink hover:bg-bg-sunken';

export function WeekView({
  days,
  rangeLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
  onDeleteSlot,
  deletingSlotId,
}: WeekViewProps) {
  const weekTotal = days.reduce((sum, day) => sum + day.slots.length, 0);

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-none text-ink">Неделя</h2>
          <p className="mt-1 truncate text-sm text-ink-soft">{rangeLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevWeek}
            className={NAV_CLASS}
            aria-label="Предыдущая неделя"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="press cursor-pointer rounded-full bg-bg-sunken/70 px-3.5 py-2 text-sm font-semibold text-ink hover:bg-bg-sunken"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className={NAV_CLASS}
            aria-label="Следующая неделя"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* At-a-glance strip: a real 7×12 time grid would be unreadable at 375px,
          so the week reads as seven columns of counts instead. */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl py-2',
              day.isToday && 'bg-accent-soft',
              day.isPast && !day.isToday && 'opacity-45',
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-soft">
              {day.weekdayShort}
            </span>
            <span
              className={cn(
                'text-[15px] font-semibold tabular-nums',
                day.isToday ? 'text-accent' : 'text-ink',
              )}
            >
              {day.dayNumber}
            </span>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                day.availableCount > 0
                  ? 'bg-accent'
                  : day.bookedCount > 0
                    ? 'bg-success'
                    : 'bg-transparent',
              )}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {weekTotal === 0 ? (
        <p className="rounded-2xl bg-bg-sunken/70 px-4 py-8 text-center text-sm text-ink-soft">
          На этой неделе окон нет. Опубликуйте их — клиенты видят только то, что вы открыли.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {days
            .filter((day) => day.slots.length > 0)
            .map((day) => (
              <div key={day.dateKey} className={cn(day.isPast && 'opacity-55')}>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">
                  {day.weekdayShort}, {day.dayNumber}
                  {day.bookedCount > 0 ? ` · занято ${day.bookedCount}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.slots.map((slot) => {
                    const isBooked = slot.status === 'booked';
                    const isDeleting = deletingSlotId === slot.id;
                    return (
                      <span
                        key={slot.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2 text-sm font-semibold tabular-nums',
                          isBooked ? 'bg-success-soft text-success' : 'bg-bg-sunken text-ink',
                          isDeleting && 'opacity-50',
                        )}
                      >
                        {slotTime(slot.startsAt)}
                        {isBooked ? (
                          <Lock size={13} weight="fill" aria-label="Занято" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDeleteSlot(slot.id)}
                            disabled={isDeleting}
                            className="press flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-bg-raised hover:text-danger"
                          >
                            <X size={12} weight="bold" />
                            <span className="sr-only">Убрать окно {slotTime(slot.startsAt)}</span>
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </GlassCard>
  );
}
