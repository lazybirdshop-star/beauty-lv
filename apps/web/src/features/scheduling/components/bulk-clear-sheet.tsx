'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { civilToInstant, FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { fmt, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { addDaysToKey, todayKey } from '../week';

/**
 * Снять свободные окна за период.
 *
 * Обратная операция к публикации периодом, и нужна она ровно так же часто:
 * мастер публикует месяц одним действием, а уезжает на неделю — и снимала окна
 * по одному, тридцатью нажатиями. Отдельной шторкой, а не второй кнопкой в
 * форме публикации: там семь полей про то, *что создать*, и ни одно из них не
 * имеет смысла для «убрать всё в этих числах».
 *
 * Дни недели, часы и шаг здесь тоже не спрашиваются намеренно. «Убери мне эту
 * неделю» — это отпуск или болезнь, то есть весь отрезок целиком; выборочное
 * снятие по вторникам это работа с отдельными окнами, для которой уже есть
 * карточка окна.
 */
function BulkClearForm({
  onClear,
  submitting,
}: {
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  submitting: boolean;
}) {
  const t = useT();
  const timeZone = useTimeZone();
  const validate = useLocalizedValidation();

  const [fromDate, setFromDate] = useState(() => todayKey(timeZone));
  const [toDate, setToDate] = useState(() => addDaysToKey(todayKey(timeZone), 6));
  const [result, setResult] = useState<{ removedCount: number } | null>(null);
  const [error, setError] = useState('');
  /* Подтверждение внутри той же шторки, а не отдельным `ConfirmSheet` поверх
     неё: шторка над шторкой — это два слоя, из которых непонятно, что закроет
     «назад». Здесь достаточно, чтобы кнопка называла последствие. */
  const [confirming, setConfirming] = useState(false);

  const invalidRange = !fromDate || !toDate || toDate < fromDate;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (invalidRange) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    try {
      /* Полночь первого дня и полночь дня, следующего за последним:
         полуинтервал `[from, to)` включает последний день целиком. Считается в
         поясе салона — сутки принадлежат ему. */
      const zone = timeZone ?? FALLBACK_TIMEZONE;
      const from = civilToInstant(fromDate, 0, zone);
      const to = civilToInstant(addDaysToKey(toDate, 1), 0, zone);
      setResult(await onClear(from, to));
      setConfirming(false);
    } catch {
      setError(t.schedule.clearFailed);
      setConfirming(false);
    }
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clear-from-date" className="text-xs font-semibold text-ink-soft">
            {t.schedule.fromDate}
          </label>
          <Input
            id="clear-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setConfirming(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clear-to-date" className="text-xs font-semibold text-ink-soft">
            {t.schedule.toDate}
          </label>
          <Input
            id="clear-to-date"
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setConfirming(false);
            }}
          />
        </div>
      </div>

      {/* Сказано до нажатия, а не после: занятое время остаётся, и мастер не
          должна узнавать об этом из числа в отчёте. */}
      <p className="text-sm text-ink-soft">{t.schedule.clearKeepsBooked}</p>

      {error ? <FieldError>{error}</FieldError> : null}

      {result ? (
        <p className="text-sm text-ink">
          {result.removedCount > 0
            ? fmt(t.schedule.clearDone, { count: result.removedCount })
            : t.schedule.clearNothing}
        </p>
      ) : null}

      <Button
        type="submit"
        variant={confirming ? 'danger' : 'secondary'}
        disabled={invalidRange || submitting}
        className="w-full"
      >
        {submitting
          ? t.common.saving
          : confirming
            ? t.schedule.clearConfirm
            : t.schedule.clearAction}
      </Button>
    </form>
  );
}

export function BulkClearSheet({
  open,
  onOpenChange,
  onClear,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  submitting: boolean;
}) {
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.schedule.clearTitle}>
      {/* Ключ по состоянию открытия: закрыв и открыв шторку, мастер получает
          чистую форму, а не прошлый отчёт «снято 12». */}
      {open ? <BulkClearForm onClear={onClear} submitting={submitting} /> : null}
    </Sheet>
  );
}
