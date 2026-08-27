'use client';

import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { FALLBACK_TIMEZONE, todayKey } from '@/lib/civil-date';
import { errorField } from '@/lib/api-error';
import { describeApiError } from '@/lib/describe-api-error';
import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';

import { civilDateTimeToIso } from '../week';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

interface PublishSlotFormProps {
  onPublish: (startsAt: string) => Promise<void>;
  submitting: boolean;
}

/**
 * Почему окно не открылось — словами, а не одним «уже опубликовано».
 *
 * Форма отвечала `slotExists` на любой отказ, и после запрета публиковать
 * поверх идущего визита это стало прямой ложью: окна на это время нет вовсе,
 * а мастер читала, что оно уже есть, и шла искать его в календаре. Час
 * окончания визита приходит вместе с кодом — тогда фраза говорит не только
 * «нельзя», но и с какого времени день снова её.
 */
function refusalText(
  error: unknown,
  t: Messages,
  locale: string,
  timeZone: string | undefined,
): string {
  const visitEndsAt = errorField(error, 'visitEndsAt');
  if (visitEndsAt) {
    return fmt(t.schedule.slotInsideVisit, { time: formatTime(visitEndsAt, locale, timeZone) });
  }
  return describeApiError(error, t, t.schedule.slotExists);
}

/**
 * Deliberately not a Sheet: publishing a window one at a time is the whole
 * workflow (PRD.md §7.4), so it stays inline at the top of the screen and
 * only the time field resets after each add — publishing several windows
 * on the same day is a rapid, repeated tap.
 */
export function PublishSlotForm({ onPublish, submitting }: PublishSlotFormProps) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [date, setDate] = useState(() => todayKey(timeZone));
  const [time, setTime] = useState('10:00');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    /* «10:00» — десять часов **в салоне**. Прежняя строка собирала момент
       из `new Date('YYYY-MM-DDTHH:MM')`, то есть в поясе устройства: та же
       форма, заполненная из поездки, открывала окно на другое реальное
       время, чем видела мастер. */
    const startsAt = new Date(civilDateTimeToIso(date, time, timeZone ?? FALLBACK_TIMEZONE));

    if (startsAt.getTime() <= Date.now()) {
      setError(t.schedule.pastSlot);
      return;
    }

    try {
      await onPublish(startsAt.toISOString());
    } catch (publishError) {
      setError(refusalText(publishError, t, locale, timeZone));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.schedule.publishSlot}</CardTitle>
      </CardHeader>
      <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* `min-w-0` because a native date field carries an intrinsic minimum
            width — the browser's own widget — and `flex-1` alone will not
            shrink past it. Below 360px the pair pushed the whole page sideways.
            Visible labels, not placeholders: a native date/time placeholder
            names nothing for a screen reader and vanishes once filled (§13.3). */}
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="publish-slot-date" className="text-xs font-semibold text-ink-soft">
              {t.schedule.date}
            </label>
            <Input
              id="publish-slot-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-w-0"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="publish-slot-time" className="text-xs font-semibold text-ink-soft">
              {t.schedule.time}
            </label>
            <Input
              id="publish-slot-time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="min-w-0"
            />
          </div>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={submitting} className="self-start">
          <Plus size={18} weight="bold" />
          {submitting ? t.schedule.publishing : t.schedule.addSlot}
        </Button>
      </form>
    </Card>
  );
}
