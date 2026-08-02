'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { datesInRange, expandSlotTimes, parseTimeToMinutes, toDateKey } from '../week';

interface BulkPublishSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (startsAt: string[]) => Promise<{ createdCount: number; skippedCount: number }>;
  submitting: boolean;
}

const STEP_OPTIONS = [30, 60, 90, 120];
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function todayKey(): string {
  return toDateKey(new Date());
}

function BulkPublishForm({
  onPublish,
  submitting,
}: Pick<BulkPublishSheetProps, 'onPublish' | 'submitting'>) {
  const [fromDate, setFromDate] = useState(todayKey);
  const [toDate, setToDate] = useState(todayKey);
  const [fromTime, setFromTime] = useState('10:00');
  const [toTime, setToTime] = useState('18:00');
  const [step, setStep] = useState(60);
  // Which weekdays inside the range to publish on — a master rarely works all seven.
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);
  const [error, setError] = useState('');

  const times = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const dates = datesInRange(new Date(`${fromDate}T00:00:00`), new Date(`${toDate}T00:00:00`))
      // `getDay()` is Sunday-first; the UI is Monday-first.
      .filter((date) => weekdays.includes((date.getDay() + 6) % 7));
    return expandSlotTimes(dates, parseTimeToMinutes(fromTime), parseTimeToMinutes(toTime), step);
  }, [fromDate, toDate, fromTime, toTime, step, weekdays]);

  // Captured once when the sheet mounts rather than read during render —
  // `Date.now()` in a render pass is an impure call, and a cutoff that
  // drifts mid-render would make the preview flicker anyway.
  const [openedAt] = useState(() => Date.now());

  const futureCount = useMemo(
    () => times.filter((iso) => new Date(iso).getTime() > openedAt).length,
    [times, openedAt],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (futureCount === 0) return;

    try {
      setResult(await onPublish(times));
    } catch {
      setError('Не удалось опубликовать окна. Попробуйте ещё раз.');
    }
  }

  function toggleWeekday(index: number) {
    setWeekdays((prev) =>
      prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bulk-from-date" className="text-xs font-semibold text-ink-soft">
            С даты
          </label>
          <Input
            id="bulk-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bulk-to-date" className="text-xs font-semibold text-ink-soft">
            По дату
          </label>
          <Input
            id="bulk-to-date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-ink-soft">Дни недели</span>
        <div className="flex gap-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={weekdays.includes(index)}
              onClick={() => toggleWeekday(index)}
              className={cn(
                'press flex-1 cursor-pointer rounded-xl py-2 text-[13px] font-semibold',
                weekdays.includes(index)
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-bg-sunken text-ink-soft',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bulk-from-time" className="text-xs font-semibold text-ink-soft">
            Начало дня
          </label>
          <Input
            id="bulk-from-time"
            type="time"
            step={900}
            value={fromTime}
            onChange={(event) => setFromTime(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bulk-to-time" className="text-xs font-semibold text-ink-soft">
            Конец дня
          </label>
          <Input
            id="bulk-to-time"
            type="time"
            step={900}
            value={toTime}
            onChange={(event) => setToTime(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-ink-soft">Шаг между окнами</span>
        <div className="flex gap-1.5">
          {STEP_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={step === value}
              onClick={() => setStep(value)}
              className={cn(
                'press flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold',
                step === value ? 'bg-accent text-accent-contrast' : 'bg-bg-sunken text-ink',
              )}
            >
              {value} мин
            </button>
          ))}
        </div>
      </div>

      {/* Preview before committing — publishing 90 windows by accident is
          tedious to undo one tap at a time. */}
      <div className="rounded-2xl bg-bg-sunken/70 px-4 py-3 text-sm">
        {futureCount > 0 ? (
          <p className="text-ink">
            Будет опубликовано <span className="font-semibold">{futureCount}</span> окон
            {times.length !== futureCount ? (
              <span className="text-ink-soft"> ({times.length - futureCount} уже в прошлом)</span>
            ) : null}
          </p>
        ) : (
          <p className="text-ink-soft">Нечего публиковать — проверьте даты, дни недели и время.</p>
        )}
      </div>

      {result ? (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          Опубликовано {result.createdCount}
          {result.skippedCount > 0 ? `, пропущено ${result.skippedCount} — уже были` : ''}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting || futureCount === 0}>
        {submitting ? 'Публикуем…' : 'Опубликовать'}
      </Button>
    </form>
  );
}

export function BulkPublishSheet({
  open,
  onOpenChange,
  onPublish,
  submitting,
}: BulkPublishSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Опубликовать период"
      description="Окна создаются явно — шаблонов рабочих часов нет"
    >
      {open ? <BulkPublishForm onPublish={onPublish} submitting={submitting} /> : null}
    </Sheet>
  );
}
