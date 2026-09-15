'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { civilToInstant, FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { listSlots } from '../api';
import { addDaysToKey, todayKey } from '../week';

const FORM_ID = 'bulk-clear-form';

/**
 * Что мастер делает с окнами периода.
 *
 * Три действия в одной шторке, а не три кнопки в шапке календаря: вопрос
 * «с какого по какое» у них общий, а различаются они одним словом на кнопке.
 * Скрытие и возврат — пара, и держать их порознь значило бы прятать обратный
 * ход от того, кто только что закрыл неделю.
 */
type PeriodAction = 'remove' | 'hide' | 'show';

interface PeriodState {
  label: string;
  count: number | null;
  destructive: boolean;
}

interface PeriodFormProps {
  slug: string;
  /** Чьи окна считать — тот же человек, чьи окна снимаются. */
  memberId: string | null;
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  onSetVisibility: (from: Date, to: Date, hidden: boolean) => Promise<{ changedCount: number }>;
  onDone: () => void;
  onState: (state: PeriodState) => void;
}

/**
 * Окна за период — шторка `clearPeriod` прототипа «Кабинет 2026»: снять,
 * скрыть или вернуть на страницу.
 *
 * Обратная операция к публикации периодом нужна ровно так же часто: мастер
 * публикует месяц одним действием, а уезжает на неделю — и правила по одному
 * окну это тридцать нажатий.
 *
 * Сколько окон заденет действие, сказано до нажатия — плашкой и на самой
 * кнопке («Снять 41 окно»): кнопка называет последствие, и второй вопрос
 * «точно?» не нужен. Занятое время остаётся, и об этом тоже сказано заранее.
 *
 * Дни недели, часы и шаг здесь не спрашиваются намеренно. «Убери мне эту
 * неделю» — это отпуск или болезнь, то есть весь отрезок целиком.
 */
function PeriodForm({
  slug,
  memberId,
  onClear,
  onSetVisibility,
  onDone,
  onState,
}: PeriodFormProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;
  const validate = useLocalizedValidation();
  const toast = useToast();

  const [action, setAction] = useState<PeriodAction>('remove');
  const [fromDate, setFromDate] = useState(() => todayKey(timeZone));
  const [toDate, setToDate] = useState(() => addDaysToKey(todayKey(timeZone), 6));
  const [error, setError] = useState('');

  const invalidRange = !fromDate || !toDate || toDate < fromDate;
  /* Полночь первого дня и полночь дня, следующего за последним: полуинтервал
     `[from, to)` включает последний день целиком. Сутки принадлежат салону. */
  const from = invalidRange ? null : civilToInstant(fromDate, 0, timeZone);
  const to = invalidRange ? null : civilToInstant(addDaysToKey(toDate, 1), 0, timeZone);

  const slots = useQuery({
    queryKey: ['slots', slug, 'period', fromDate, toDate, memberId],
    queryFn: () => listSlots(slug, { from: from!, to: to! }, memberId ?? undefined),
    enabled: from !== null,
  });
  const own = (slots.data ?? []).filter(
    (slot) => !memberId || slot.organizationMemberId === memberId,
  );
  const free = own.filter((slot) => slot.status === 'available');
  const booked = own.filter((slot) => slot.status === 'booked').length;
  const target =
    action === 'remove'
      ? free.length
      : action === 'hide'
        ? free.filter((slot) => !slot.hiddenAt).length
        : free.filter((slot) => slot.hiddenAt).length;
  const count = slots.data ? target : null;

  const labels: Record<PeriodAction, { tab: string; action: string; count: string }> = {
    remove: {
      tab: t.schedule.periodRemove,
      action: t.schedule.clearAction,
      count: t.schedule.clearCount,
    },
    hide: {
      tab: t.schedule.periodHide,
      action: t.schedule.hideAction,
      count: t.schedule.hideCount,
    },
    show: {
      tab: t.schedule.periodShow,
      action: t.schedule.showAction,
      count: t.schedule.showCount,
    },
  };

  const label =
    count === null || count === 0
      ? labels[action].action
      : fmt(labels[action].count, {
          count,
          slots: plural(locale, count, t.common.slotForms),
        });

  /* Подвал живёт вне формы: подпись и доступность кнопки он узнаёт от неё.
     Снятие стирает окна, скрытие — обратимо: красной остаётся только первая. */
  useEffect(() => {
    onState({ label, count: invalidRange ? 0 : count, destructive: action === 'remove' });
  }, [label, count, invalidRange, action, onState]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!from || !to) return;

    try {
      const done =
        action === 'remove'
          ? (await onClear(from, to)).removedCount
          : (await onSetVisibility(from, to, action === 'hide')).changedCount;
      toast({
        message:
          done > 0
            ? fmt(
                action === 'remove'
                  ? t.schedule.clearDone
                  : action === 'hide'
                    ? t.schedule.hideDone
                    : t.schedule.showDone,
                { count: done },
              )
            : /* «Ничего не изменилось» звучит по-разному: у возврата не было
                 скрытых окон, у остальных — свободных. */
              action === 'show'
              ? t.schedule.showNothing
              : t.schedule.hideNothing,
      });
      onDone();
    } catch {
      setError(
        action === 'remove'
          ? t.schedule.clearFailed
          : action === 'hide'
            ? t.schedule.hideFailed
            : t.schedule.showFailed,
      );
    }
  }

  return (
    <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Tabs
        value={action}
        onValueChange={(next) => {
          setAction(next as PeriodAction);
          setError('');
        }}
      >
        <TabsList className="sheet-tabs">
          {(['remove', 'hide', 'show'] as const).map((key) => (
            <TabsTrigger key={key} value={key}>
              {labels[key].tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="form-grid">
        <Field id="clear-from-date" label={t.schedule.fromDate}>
          <Input
            id="clear-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </Field>
        <Field id="clear-to-date" label={t.schedule.toDate}>
          <Input
            id="clear-to-date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </Field>
      </div>

      {count !== null ? (
        <div className="info-cell">
          <p className="info-cell__meta">
            {action === 'show' ? t.schedule.periodHiddenIn : t.schedule.periodFreeIn}
          </p>
          <p className="info-cell__figure tnum">{count}</p>
          {booked > 0 && action !== 'show' ? (
            <p className="info-cell__meta">{fmt(t.schedule.periodBookedStay, { count: booked })}</p>
          ) : null}
        </div>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

export function BulkClearSheet({
  open,
  onOpenChange,
  slug,
  memberId,
  onClear,
  onSetVisibility,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  memberId: string | null;
  onClear: (from: Date, to: Date) => Promise<{ removedCount: number }>;
  onSetVisibility: (from: Date, to: Date, hidden: boolean) => Promise<{ changedCount: number }>;
  submitting: boolean;
}) {
  const t = useT();
  const [state, setState] = useState<PeriodState>({
    label: t.schedule.clearAction,
    count: null,
    destructive: true,
  });
  const onState = useCallback((next: PeriodState) => setState(next), []);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.periodTitle}
      description={t.schedule.clearPeriodHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant={state.destructive ? 'danger-solid' : 'primary'}
            disabled={submitting || state.count === 0}
          >
            {submitting ? t.common.saving : state.label}
          </Button>
        </>
      }
    >
      {/* Ключ по состоянию открытия: закрыв и открыв шторку, мастер получает
          чистую форму. */}
      {open ? (
        <PeriodForm
          slug={slug}
          memberId={memberId}
          onClear={onClear}
          onSetVisibility={onSetVisibility}
          onDone={() => onOpenChange(false)}
          onState={onState}
        />
      ) : null}
    </Sheet>
  );
}
