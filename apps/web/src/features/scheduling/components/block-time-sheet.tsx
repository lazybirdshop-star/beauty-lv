'use client';

/**
 * Шторка «Заблокировать время» — спецификация §24, прототип «Кабинет 2026».
 *
 * Отвечает на вопрос «меня здесь нет»: обед, личное, отпуск. Не форма
 * закрытия окон — окна под блоком снимает сервер, и открыть их поверх блока
 * уже нельзя, пока блок стоит.
 *
 * Причина — одним нажатием: четыре частых ответа стоят над полем, и поле
 * остаётся для своего. «Отпуск» сразу включает «весь день» — отпуск по часам
 * не берут. Повтор предлагается только блоку в пределах одного дня: «отпуск
 * каждую неделю» — не то, что кто-то имеет в виду.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { SwitchRow } from '@/components/ui/switch-row';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorField } from '@/lib/api-error';
import { FALLBACK_TIMEZONE, addDaysToKey, todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { formatCivilDay, formatDayMonth, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { TimeBlockInput } from '../api';
import { REPEAT_WEEKS, blockInterval } from '../time-block-form';

/** Тот же предел, что у названий на сервере (`FIELD_LIMITS.name`). */
const TITLE_MAX = 120;
const FORM_ID = 'block-time-form';
/** Сколько недель предлагается, когда включили «Каждую неделю». */
const DEFAULT_WEEKS = 4;

export function BlockTimeSheet({
  open,
  onOpenChange,
  initial,
  owner,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** День и часы места, по которому нажали в календаре. */
  initial?: { date?: string; from?: string; to?: string };
  /** «За кого» — только у того, кто ведёт чужое расписание. */
  owner?: {
    members: { id: string; name: string }[];
    memberId: string;
    onChange: (memberId: string) => void;
  };
  submitting: boolean;
  onSubmit: (input: Omit<TimeBlockInput, 'organizationMemberId'>) => Promise<void>;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;
  const validate = useLocalizedValidation();

  const [earliest] = useState(() => todayKey(timeZone));
  const [date, setDate] = useState(() => initial?.date ?? earliest);
  const [untilDate, setUntilDate] = useState(() => initial?.date ?? earliest);
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState(initial?.from ?? '13:00');
  const [to, setTo] = useState(initial?.to ?? '14:00');
  const [title, setTitle] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [error, setError] = useState('');

  const presets = [
    { label: t.schedule.blockLunch, allDay: false },
    { label: t.schedule.blockBreak, allDay: false },
    { label: t.schedule.blockPersonal, allDay: false },
    { label: t.schedule.blockVacation, allDay: true },
  ];

  const draft = blockInterval({ date, allDay, from, to, untilDate }, timeZone);
  const repeatable = draft.ok && draft.singleDay;

  /* Правка любого поля гасит прежний отказ: он относится к отправленному. */
  function change<T>(setter: (value: T) => void, value: T) {
    setError('');
    setter(value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!draft.ok) {
      setError(draft.reason === 'order' ? t.schedule.blockEndBeforeStart : t.schedule.blockTooLong);
      return;
    }
    if (new Date(draft.endsAt).getTime() <= Date.now()) {
      setError(t.schedule.pastTime);
      return;
    }
    try {
      await onSubmit({
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        title: title.trim() || undefined,
        repeatWeeks: repeatable && repeatWeeks > 1 ? repeatWeeks : undefined,
      });
      onOpenChange(false);
    } catch (refusal) {
      /* Время визита едет вместе с отказом: «на 14:30 записан клиент» сразу
         говорит, что двигать — визит или блок. */
      const bookingStartsAt = errorField(refusal, 'bookingStartsAt');
      setError(
        bookingStartsAt
          ? fmt(t.schedule.blockOverlapsAt, {
              time: `${formatDayMonth(new Date(bookingStartsAt), locale, timeZone)}, ${formatTime(bookingStartsAt, locale, timeZone)}`,
            })
          : describeApiError(refusal, t),
      );
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.blockTime}
      description={t.schedule.blockHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? t.schedule.blockSaving : t.schedule.blockSave}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={validate} onSubmit={submit} className="flex flex-col gap-6">
        <SheetSection title={t.schedule.blockTitleLabel}>
          <div className="pick-chips">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                className="pick-chip"
                aria-pressed={title === preset.label}
                onClick={() => {
                  change(setTitle, preset.label);
                  if (preset.allDay) setAllDay(true);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Input
            id="block-title"
            aria-label={t.schedule.blockTitleLabel}
            value={title}
            maxLength={TITLE_MAX}
            placeholder={t.schedule.blockTitlePlaceholder}
            onChange={(event) => change(setTitle, event.target.value)}
          />
        </SheetSection>

        {owner ? (
          <Field id="block-owner" label={t.schedule.member}>
            <Select
              id="block-owner"
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

        <SheetSection title={t.schedule.blockWhen}>
          <div className={allDay ? 'form-grid' : 'flex flex-col'}>
            <Field id="block-date" label={allDay ? t.schedule.fromDate : t.schedule.date}>
              <Input
                id="block-date"
                type="date"
                required
                min={earliest}
                value={date}
                onChange={(event) => {
                  const next = event.target.value;
                  change(setDate, next);
                  if (untilDate < next) setUntilDate(next);
                }}
              />
            </Field>
            {allDay ? (
              <Field id="block-until" label={t.schedule.toDate}>
                <Input
                  id="block-until"
                  type="date"
                  required
                  min={date}
                  value={untilDate}
                  onChange={(event) => change(setUntilDate, event.target.value)}
                />
              </Field>
            ) : null}
          </div>

          <SwitchRow
            label={t.schedule.blockAllDay}
            checked={allDay}
            onChange={(next) => change(setAllDay, next)}
          />

          {allDay ? null : (
            <div className="form-grid">
              <Field id="block-from" label={t.schedule.blockFrom}>
                <Input
                  id="block-from"
                  type="time"
                  required
                  step={300}
                  value={from}
                  onChange={(event) => change(setFrom, event.target.value)}
                />
              </Field>
              <Field id="block-to" label={t.schedule.blockTo}>
                <Input
                  id="block-to"
                  type="time"
                  required
                  step={300}
                  value={to}
                  onChange={(event) => change(setTo, event.target.value)}
                />
              </Field>
            </div>
          )}
        </SheetSection>

        {repeatable ? (
          <SheetSection title={t.schedule.blockRepeat}>
            <Tabs
              value={repeatWeeks > 1 ? 'weekly' : 'none'}
              onValueChange={(next) => setRepeatWeeks(next === 'weekly' ? DEFAULT_WEEKS : 1)}
            >
              <TabsList aria-label={t.schedule.blockRepeat} className="sheet-tabs">
                <TabsTrigger value="none">{t.schedule.blockRepeatNone}</TabsTrigger>
                <TabsTrigger value="weekly">{t.schedule.blockRepeatWeekly}</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Конец повтора — датой, а не числом недель: «до 8 октября»
                отвечает на вопрос, который мастер себе задаёт. */}
            {repeatWeeks > 1 ? (
              <Field id="block-repeat" label={t.schedule.blockUntilDate}>
                <Select
                  id="block-repeat"
                  value={String(repeatWeeks)}
                  onChange={(event) => setRepeatWeeks(Number(event.target.value))}
                >
                  {REPEAT_WEEKS.filter((weeks) => weeks > 1).map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {formatCivilDay(addDaysToKey(date, 7 * (weeks - 1)), locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </SheetSection>
        ) : null}

        {error ? <FieldError>{error}</FieldError> : null}
      </form>
    </Sheet>
  );
}
