'use client';

/**
 * Шторка «Заблокировать время» — спецификация §24.
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

import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
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
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.blockTime}
      subtitle={t.schedule.blockHint}
      closeLabel={t.common.close}
      footer={
        <button
          type="submit"
          form="block-time-form"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? t.schedule.blockSaving : t.schedule.blockSave}
        </button>
      }
    >
      <form id="block-time-form" ref={validate} onSubmit={submit} className="block-form">
        {owner ? (
          <div className="block-form__field">
            <label htmlFor="block-owner" className="t-label">
              {t.schedule.member}
            </label>
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
          </div>
        ) : null}

        <div className="block-form__field">
          <label htmlFor="block-title" className="t-label">
            {t.schedule.blockTitleLabel}
          </label>
          <div className="block-form__presets">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                className={title === preset.label ? 'chip is-on' : 'chip'}
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
            value={title}
            maxLength={TITLE_MAX}
            placeholder={t.schedule.blockTitlePlaceholder}
            onChange={(event) => change(setTitle, event.target.value)}
          />
        </div>

        <div className="block-form__switch">
          <span className="t-label">{t.schedule.blockAllDay}</span>
          <Switch
            checked={allDay}
            onCheckedChange={(next) => change(setAllDay, next)}
            label={t.schedule.blockAllDay}
          />
        </div>

        <div className="block-form__pair">
          <div className="block-form__field">
            <label htmlFor="block-date" className="t-label">
              {allDay ? t.schedule.fromDate : t.schedule.date}
            </label>
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
              className="min-w-0"
            />
          </div>
          {allDay ? (
            <div className="block-form__field">
              <label htmlFor="block-until" className="t-label">
                {t.schedule.toDate}
              </label>
              <Input
                id="block-until"
                type="date"
                required
                min={date}
                value={untilDate}
                onChange={(event) => change(setUntilDate, event.target.value)}
                className="min-w-0"
              />
            </div>
          ) : null}
        </div>

        {allDay ? null : (
          <div className="block-form__pair">
            <div className="block-form__field">
              <label htmlFor="block-from" className="t-label">
                {t.schedule.blockFrom}
              </label>
              <Input
                id="block-from"
                type="time"
                required
                step={300}
                value={from}
                onChange={(event) => change(setFrom, event.target.value)}
                className="min-w-0"
              />
            </div>
            <div className="block-form__field">
              <label htmlFor="block-to" className="t-label">
                {t.schedule.blockTo}
              </label>
              <Input
                id="block-to"
                type="time"
                required
                step={300}
                value={to}
                onChange={(event) => change(setTo, event.target.value)}
                className="min-w-0"
              />
            </div>
          </div>
        )}

        {repeatable ? (
          <div className="block-form__field">
            <label htmlFor="block-repeat" className="t-label">
              {t.schedule.blockRepeat}
            </label>
            {/* Конец повтора — датой, а не числом недель: «до 8 октября»
                отвечает на вопрос, который мастер себе задаёт. */}
            <Select
              id="block-repeat"
              value={String(repeatWeeks)}
              onChange={(event) => setRepeatWeeks(Number(event.target.value))}
            >
              {REPEAT_WEEKS.map((weeks) => (
                <option key={weeks} value={weeks}>
                  {weeks === 1
                    ? t.schedule.blockRepeatNone
                    : fmt(t.schedule.blockRepeatUntil, {
                        date: formatCivilDay(addDaysToKey(date, 7 * (weeks - 1)), locale),
                      })}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {error ? <FieldError>{error}</FieldError> : null}
      </form>
    </SideSheet>
  );
}
