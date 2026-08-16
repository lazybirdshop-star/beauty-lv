'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { mondayFirstWeekdays } from '@/lib/format';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { fmt, plural, useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { expandSlotTimes, keysInRange, parseTimeToMinutes, todayKey, weekdayIndex } from '../week';

interface BulkPublishSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (startsAt: string[]) => Promise<{ createdCount: number; skippedCount: number }>;
  submitting: boolean;
}

const STEP_OPTIONS = [30, 60, 90, 120];

function BulkPublishForm({
  onPublish,
  submitting,
}: Pick<BulkPublishSheetProps, 'onPublish' | 'submitting'>) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const weekdayLabels = useMemo(() => mondayFirstWeekdays(locale), [locale]);
  const [fromDate, setFromDate] = useState(() => todayKey(timeZone));
  const [toDate, setToDate] = useState(() => todayKey(timeZone));
  const [fromTime, setFromTime] = useState('10:00');
  const [toTime, setToTime] = useState('18:00');
  const [step, setStep] = useState(60);
  // Which weekdays inside the range to publish on — a master rarely works all seven.
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);
  const [error, setError] = useState('');

  const times = useMemo(() => {
    if (!fromDate || !toDate) return [];
    /* Даты — гражданские, и «10:00» разворачивается в момент по часам салона.
       Прежняя реализация собирала момент через `setHours` на `Date`, то есть в
       поясе устройства: та же форма, заполненная из поездки, публиковала окна
       на другое реальное время, чем видела мастер. */
    const dates = keysInRange(fromDate, toDate).filter((key) =>
      weekdays.includes(weekdayIndex(key)),
    );
    return expandSlotTimes(
      dates,
      parseTimeToMinutes(fromTime),
      parseTimeToMinutes(toTime),
      step,
      timeZone ?? FALLBACK_TIMEZONE,
    );
  }, [fromDate, toDate, fromTime, toTime, step, weekdays, timeZone]);

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
      setError(t.schedule.bulkFailed);
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
            {t.schedule.fromDate}
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
            {t.schedule.toDate}
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
        <span className="text-xs font-semibold text-ink-soft">{t.schedule.weekdays}</span>
        <div className="flex gap-1">
          {weekdayLabels.map((label, index) => (
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
            {t.schedule.dayStart}
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
            {t.schedule.dayEnd}
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
        <span className="text-xs font-semibold text-ink-soft">{t.schedule.step}</span>
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
              {value} {t.common.minutesShort}
            </button>
          ))}
        </div>
      </div>

      {/* Preview before committing — publishing 90 windows by accident is
          tedious to undo one tap at a time. */}
      <div className="rounded-2xl bg-bg-sunken/70 px-4 py-3 text-sm">
        {futureCount > 0 ? (
          <p className="text-ink">
            {t.schedule.willPublish} <span className="font-semibold">{futureCount}</span>{' '}
            {plural(locale, futureCount, {
              zero: t.schedule.slotCountZero,
              one: t.schedule.slotCountOne,
              few: t.schedule.slotCountFew,
              many: t.schedule.slotCountMany,
              other: t.schedule.slotCountOther,
            })}
            {times.length !== futureCount ? (
              <span className="text-ink-soft">
                {' '}
                {fmt(t.schedule.alreadyPast, { count: times.length - futureCount })}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-ink-soft">{t.schedule.nothingToPublish}</p>
        )}
      </div>

      {result ? (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          {fmt(t.schedule.published, { count: result.createdCount })}
          {result.skippedCount > 0 ? fmt(t.schedule.skipped, { count: result.skippedCount }) : ''}
        </p>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="w-full" disabled={submitting || futureCount === 0}>
        {submitting ? t.schedule.publishing : t.schedule.publish}
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
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.bulkTitle}
      description={t.schedule.bulkHint}
    >
      {open ? <BulkPublishForm onPublish={onPublish} submitting={submitting} /> : null}
    </Sheet>
  );
}
