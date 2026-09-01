'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { civilToInstant, FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { addDaysToKey, todayKey } from '../week';

/**
 * Что мастер делает с окнами периода.
 *
 * Три действия в одной шторке, а не три кнопки в шапке календаря: вопрос
 * «с какого по какое» у них общий, а различаются они одним словом на кнопке.
 * Скрытие и возврат — пара, и держать их порознь значило бы прятать обратный
 * ход от того, кто только что закрыл неделю.
 */
type PeriodAction = 'remove' | 'hide' | 'show';

interface PeriodFormProps {
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  onSetVisibility: (from: Date, to: Date, hidden: boolean) => Promise<{ changedCount: number }>;
  submitting: boolean;
}

/**
 * Окна за период: снять, скрыть или вернуть на страницу.
 *
 * Обратная операция к публикации периодом нужна ровно так же часто: мастер
 * публикует месяц одним действием, а уезжает на неделю — и правила по одному
 * окну это тридцать нажатий. Отдельной шторкой, а не второй кнопкой в форме
 * публикации: там семь полей про то, *что создать*, и ни одно из них не имеет
 * смысла для «убрать всё в этих числах».
 *
 * Дни недели, часы и шаг здесь тоже не спрашиваются намеренно. «Убери мне эту
 * неделю» — это отпуск или болезнь, то есть весь отрезок целиком; выборочная
 * работа по вторникам — это работа с отдельными окнами, для которой уже есть
 * карточка окна.
 */
function PeriodForm({ onClear, onSetVisibility, submitting }: PeriodFormProps) {
  const t = useT();
  const timeZone = useTimeZone();
  const validate = useLocalizedValidation();

  const [action, setAction] = useState<PeriodAction>('remove');
  const [fromDate, setFromDate] = useState(() => todayKey(timeZone));
  const [toDate, setToDate] = useState(() => addDaysToKey(todayKey(timeZone), 6));
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  /* Подтверждение внутри той же шторки, а не отдельным `ConfirmSheet` поверх
     неё: шторка над шторкой — это два слоя, из которых непонятно, что закроет
     «назад». Здесь достаточно, чтобы кнопка называла последствие. */
  const [confirming, setConfirming] = useState(false);

  const invalidRange = !fromDate || !toDate || toDate < fromDate;

  const labels: Record<PeriodAction, { tab: string; action: string; confirm: string }> = {
    remove: {
      tab: t.schedule.periodRemove,
      action: t.schedule.clearAction,
      confirm: t.schedule.clearConfirm,
    },
    hide: {
      tab: t.schedule.periodHide,
      action: t.schedule.hideAction,
      confirm: t.schedule.hideConfirm,
    },
    show: {
      tab: t.schedule.periodShow,
      action: t.schedule.showAction,
      confirm: t.schedule.showConfirm,
    },
  };

  /* Снятие стирает окна, скрытие — обратимо той же кнопкой. Красной остаётся
     только первая: одинаковый цвет учил бы, что все три одинаково опасны. */
  const destructive = action === 'remove';

  function reset() {
    setConfirming(false);
    setResult(null);
    setError('');
  }

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

      if (action === 'remove') {
        setResult((await onClear(from, to)).removedCount);
      } else {
        setResult((await onSetVisibility(from, to, action === 'hide')).changedCount);
      }
      setConfirming(false);
    } catch {
      setError(
        action === 'remove'
          ? t.schedule.clearFailed
          : action === 'hide'
            ? t.schedule.hideFailed
            : t.schedule.showFailed,
      );
      setConfirming(false);
    }
  }

  function resultText(count: number): string {
    if (count > 0) {
      const done =
        action === 'remove'
          ? t.schedule.clearDone
          : action === 'hide'
            ? t.schedule.hideDone
            : t.schedule.showDone;
      return fmt(done, { count });
    }
    /* «Ничего не изменилось» звучит по-разному у разных действий: у возврата
       не было скрытых окон, у остальных — свободных. */
    return action === 'show' ? t.schedule.showNothing : t.schedule.hideNothing;
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Tabs
        value={action}
        onValueChange={(next) => {
          setAction(next as PeriodAction);
          reset();
        }}
      >
        <TabsList className="w-full">
          {(['remove', 'hide', 'show'] as const).map((key) => (
            <TabsTrigger key={key} value={key} className="flex-1">
              {labels[key].tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
              reset();
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
              reset();
            }}
          />
        </div>
      </div>

      {/* Сказано до нажатия, а не после: занятое время остаётся, и мастер не
          должна узнавать об этом из числа в отчёте. */}
      <p className="text-sm text-ink-soft">
        {action === 'remove' ? t.schedule.clearKeepsBooked : t.schedule.hideKeepsBooked}
      </p>

      {error ? <FieldError>{error}</FieldError> : null}

      {result !== null ? <p className="text-sm text-ink">{resultText(result)}</p> : null}

      <Button
        type="submit"
        variant={confirming && destructive ? 'danger' : 'secondary'}
        disabled={invalidRange || submitting}
        className="w-full"
      >
        {submitting ? t.common.saving : confirming ? labels[action].confirm : labels[action].action}
      </Button>
    </form>
  );
}

export function BulkClearSheet({
  open,
  onOpenChange,
  onClear,
  onSetVisibility,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  onSetVisibility: (from: Date, to: Date, hidden: boolean) => Promise<{ changedCount: number }>;
  submitting: boolean;
}) {
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.schedule.periodTitle}>
      {/* Ключ по состоянию открытия: закрыв и открыв шторку, мастер получает
          чистую форму, а не прошлый отчёт «снято 12». */}
      {open ? (
        <PeriodForm onClear={onClear} onSetVisibility={onSetVisibility} submitting={submitting} />
      ) : null}
    </Sheet>
  );
}
