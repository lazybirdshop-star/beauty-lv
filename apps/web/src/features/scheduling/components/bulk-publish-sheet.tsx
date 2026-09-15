'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DangerZone } from '@/components/ui/danger-zone';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { formatDuration, mondayFirstWeekdays } from '@/lib/format';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { BulkPublishResult } from '../api';
import type { PublishedSlot } from '../types';
import { expandSlotTimes, keysInRange, parseTimeToMinutes, todayKey, weekdayIndex } from '../week';

/** За кого открывают время — у того, кто ведёт чужое расписание. */
export interface PeriodOwner {
  members: { id: string; name: string }[];
  memberId: string;
  onChange: (memberId: string) => void;
}

interface BulkPublishSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (startsAt: string[]) => Promise<BulkPublishResult>;
  submitting: boolean;
  /**
   * Окна, которые у мастера уже открыты.
   *
   * Предпросмотр считал сетку и ничего не знал о них: шторка обещала «Будет
   * опубликовано 32 окна», а после нажатия отвечала «Опубликовано 0,
   * пропущено 32». Обещание и результат должны считаться по одному правилу.
   */
  existing: PublishedSlot[];
  owner?: PeriodOwner;
  /** «Снять окна за период» — обратное действие, своя шторка. */
  onClearPeriod: () => void;
}

const FORM_ID = 'bulk-publish-form';
const STEP_OPTIONS = [30, 60, 90, 120];

function BulkPublishForm({
  onPublish,
  existing,
  owner,
  onClearPeriod,
  onCount,
}: Pick<BulkPublishSheetProps, 'onPublish' | 'existing' | 'owner' | 'onClearPeriod'> & {
  /** Сколько окон будет опубликовано — для подписи кнопки в подвале. */
  onCount: (count: number) => void;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const weekdayLabels = useMemo(() => mondayFirstWeekdays(locale), [locale]);
  const [fromDate, setFromDate] = useState(() => todayKey(timeZone));
  const [toDate, setToDate] = useState(() => todayKey(timeZone));
  /* Тот же снимок «сегодня», что и у `openedAt` ниже, и по той же причине:
     чтение часов из тела рендера — нечистый вызов. */
  const [earliestDate] = useState(() => todayKey(timeZone));
  const [fromTime, setFromTime] = useState('10:00');
  const [toTime, setToTime] = useState('18:00');
  const [step, setStep] = useState(60);
  // Which weekdays inside the range to publish on — a master rarely works all seven.
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [result, setResult] = useState<BulkPublishResult | null>(null);
  const [error, setError] = useState('');
  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };

  /**
   * Одна дата — это не период, и сужать в ней нечего.
   *
   * Дни недели существуют, чтобы проредить длинный отрезок: мастер работает
   * не все семь. На отрезке в одну дату они умеют ровно две вещи — пропустить
   * её целиком или не пропустить, — и второе никогда не то, чего от них
   * хотели.
   */
  const singleDay = fromDate !== '' && fromDate === toDate;

  const dates = useMemo(
    () =>
      !fromDate || !toDate
        ? []
        : keysInRange(fromDate, toDate).filter(
            (key) => singleDay || weekdays.includes(weekdayIndex(key)),
          ),
    [fromDate, toDate, singleDay, weekdays],
  );

  /* Даты — гражданские, и «10:00» разворачивается в момент по часам салона:
     та же форма, заполненная из поездки, не должна публиковать окна на другое
     реальное время, чем видела мастер. */
  const times = useMemo(
    () =>
      expandSlotTimes(
        dates,
        parseTimeToMinutes(fromTime),
        parseTimeToMinutes(toTime),
        step,
        timeZone ?? FALLBACK_TIMEZONE,
      ),
    [dates, fromTime, toTime, step, timeZone],
  );

  // Captured once when the sheet mounts rather than read during render —
  // `Date.now()` in a render pass is an impure call.
  const [openedAt] = useState(() => Date.now());

  /* Уже открытые часы — множеством моментов, а не строк: одно и то же время,
     записанное с разным смещением, это одно окно, и сервер считает его так же. */
  const publishedAt = useMemo(
    () => new Set(existing.map((slot) => new Date(slot.startsAt).getTime())),
    [existing],
  );

  const future = useMemo(
    () => times.filter((iso) => new Date(iso).getTime() > openedAt),
    [times, openedAt],
  );
  const fresh = useMemo(
    () => future.filter((iso) => !publishedAt.has(new Date(iso).getTime())),
    [future, publishedAt],
  );
  const futureCount = fresh.length;
  const alreadyCount = future.length - fresh.length;
  const pastCount = times.length - future.length;
  const perDay = dates.length ? Math.round(times.length / dates.length) : 0;

  useEffect(() => {
    onCount(futureCount);
  }, [futureCount, onCount]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (futureCount === 0) return;

    try {
      /* Отправляем ровно то, что обещали, а не всю сетку: прошедшие часы и
         уже открытые сервер отбросил бы сам, но тогда «пропущено 32» в ответе
         означало бы не гонку, а нашу же арифметику. */
      setResult(await onPublish(fresh));
    } catch {
      setError(t.schedule.bulkFailed);
    }
  }

  function toggleWeekday(index: number) {
    setWeekdays((prev) =>
      prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index],
    );
  }

  const details = [
    fmt(t.schedule.previewMeta, {
      days: `${dates.length} ${plural(locale, dates.length, t.schedule.dayForms)}`,
      perDay: `${perDay} ${plural(locale, perDay, t.common.slotForms)}`,
    }),
    alreadyCount > 0 ? fmt(t.schedule.alreadyOpen, { count: alreadyCount }) : null,
    pastCount > 0 ? fmt(t.schedule.alreadyPast, { count: pastCount }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="sheet-grid">
        {/* `min` — сегодня по часам салона: прошедшие часы публикация всё
            равно отбрасывает, и предлагать их в пикере незачем. */}
        <Field id="bulk-from-date" label={t.schedule.fromDate}>
          <Input
            id="bulk-from-date"
            type="date"
            min={earliestDate}
            value={fromDate}
            /* Конец периода едет за началом, если начало его обогнало: иначе
               вывернутый отрезок и «нечего публиковать» при заполненных полях. */
            onChange={(event) => {
              const next = event.target.value;
              setFromDate(next);
              if (next !== '' && (toDate === '' || toDate < next)) setToDate(next);
            }}
          />
        </Field>
        <Field id="bulk-to-date" label={t.schedule.toDate}>
          <Input
            id="bulk-to-date"
            type="date"
            min={fromDate || earliestDate}
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </Field>
      </div>

      {/* На одной дате ряда нет вовсе — ни выключенного, ни пустого: выбор,
          который ни на что не влияет, всё равно приходится прочитать. */}
      {singleDay ? null : (
        <div className="form-field">
          <span className="form-field__label" id="bulk-weekdays-label">
            {t.schedule.weekdays}
          </span>
          <div className="pick-chips" role="group" aria-labelledby="bulk-weekdays-label">
            {weekdayLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                className="pick-chip"
                aria-pressed={weekdays.includes(index)}
                onClick={() => toggleWeekday(index)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sheet-grid">
        <Field id="bulk-from-time" label={t.schedule.dayStart}>
          <Input
            id="bulk-from-time"
            type="time"
            step={900}
            value={fromTime}
            onChange={(event) => setFromTime(event.target.value)}
          />
        </Field>
        <Field id="bulk-to-time" label={t.schedule.dayEnd}>
          <Input
            id="bulk-to-time"
            type="time"
            step={900}
            value={toTime}
            onChange={(event) => setToTime(event.target.value)}
          />
        </Field>
        <Field id="bulk-step" label={t.schedule.step}>
          <Select
            id="bulk-step"
            value={String(step)}
            onChange={(event) => setStep(Number(event.target.value))}
          >
            {STEP_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatDuration(value, units)}
              </option>
            ))}
          </Select>
        </Field>
        {owner ? (
          <Field id="bulk-owner" label={t.schedule.member}>
            <Select
              id="bulk-owner"
              value={owner.memberId}
              onChange={(event) => owner.onChange(event.target.value)}
            >
              {owner.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      {/* Предпросмотр до публикации — чернильной плиткой прототипа: девяносто
          окон по ошибке неудобно снимать по одному. */}
      <section className="income-card publish-preview" aria-live="polite">
        <p className="income-card__label">{t.schedule.willPublish}</p>
        <p className="income-card__value tnum">
          {futureCount} {plural(locale, futureCount, t.common.slotForms)}
        </p>
        <p className="income-card__hint">
          {futureCount > 0 || alreadyCount > 0
            ? details
            : singleDay
              ? t.schedule.nothingToPublishDay
              : t.schedule.nothingToPublish}
        </p>
      </section>

      {result ? (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          {fmt(t.schedule.published, { count: result.createdCount })}
          {result.skippedCount > 0 ? fmt(t.schedule.skipped, { count: result.skippedCount }) : ''}
          {/* Две причины пропуска, и они разные: «уже были» мастер найдёт в
              календаре, а «занято визитом» — время, которого там не будет,
              пока запись не отменят. */}
          {result.busyCount > 0 ? fmt(t.schedule.skippedBusy, { count: result.busyCount }) : ''}
          {result.blockedCount > 0
            ? fmt(t.schedule.skippedBlocked, { count: result.blockedCount })
            : ''}
        </p>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}

      <DangerZone title={t.schedule.undoTitle} hint={t.schedule.clearPeriodHint}>
        <Button
          type="button"
          variant="ghost"
          className="danger-zone__action"
          onClick={onClearPeriod}
        >
          <Icon name="trash" className="ico-16" />
          <span>{t.schedule.clearPeriodLong}</span>
        </Button>
      </DangerZone>
    </form>
  );
}

/**
 * «Опубликовать период» — шторка `publishPeriod` прототипа «Кабинет 2026»:
 * даты, дни недели, часы, шаг и мастер; чернильная плитка «Будет
 * опубликовано N окон»; обратное действие в красной рамке; внизу «Отмена» и
 * «Опубликовать N окон».
 */
export function BulkPublishSheet({
  open,
  onOpenChange,
  onPublish,
  submitting,
  existing,
  owner,
  onClearPeriod,
}: BulkPublishSheetProps) {
  const t = useT();
  const locale = useLocale();
  const [count, setCount] = useState(0);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.bulkTitle}
      description={t.schedule.bulkHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting || count === 0}>
            {submitting
              ? t.schedule.publishing
              : fmt(t.schedule.publishCount, {
                  count,
                  slots: plural(locale, count, t.common.slotForms),
                })}
          </Button>
        </>
      }
    >
      {open ? (
        <BulkPublishForm
          onPublish={onPublish}
          existing={existing}
          owner={owner}
          onClearPeriod={onClearPeriod}
          onCount={setCount}
        />
      ) : null}
    </Sheet>
  );
}
