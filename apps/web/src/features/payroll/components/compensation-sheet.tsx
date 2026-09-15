'use client';

/**
 * «Условия расчёта» — шторка `compensation` прототипа «Кабинет 2026».
 *
 * Новые условия не правят старые, а начинают действовать с даты: поднятый
 * процент не переписывает уже согласованный месяц (SALON.md §7.2). Поэтому
 * форма одна — «новые условия с такого-то дня», — а под ней история целиком:
 * на вопрос «с какого числа у Юли 50 %» ответ должен быть на экране, а не в
 * памяти владелицы.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { RadioCards, SheetSection } from '@/components/ui/sheet-parts';
import { useToast } from '@/components/ui/toast';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import {
  createCompensation,
  type CompensationInput,
  type CompensationType,
  type RentPeriod,
} from '../api';
import { parseMoney, parsePercent } from '../terms';

const FORM_ID = 'compensation-form';

/** Строка истории: с какого дня и какие условия словами. */
export interface TermsHistoryRow {
  id: string;
  effectiveFrom: string;
  label: string;
}

export function CompensationSheet({
  open,
  onOpenChange,
  slug,
  memberId,
  memberName,
  today,
  history,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  memberId: string;
  memberName: string;
  /** Сегодня в поясе салона — умолчание «Действуют с». */
  today: string;
  history: TermsHistoryRow[];
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const cache = useQueryClient();

  const [type, setType] = useState<CompensationType>('percent');
  const [percent, setPercent] = useState('');
  const [rent, setRent] = useState('');
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>('month');
  const [salary, setSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [error, setError] = useState('');

  /* Закрытая шторка забывает набранное: следующее «Изменить» начинается с
     чистой формы, а не с прошлой брошенной попытки. */
  function close(next: boolean) {
    if (!next) {
      setType('percent');
      setPercent('');
      setRent('');
      setSalary('');
      setEffectiveFrom(today);
      setError('');
    }
    onOpenChange(next);
  }

  const save = useMutation({
    mutationFn: (input: CompensationInput) => createCompensation(slug, input),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['compensation', slug] });
      toast({ message: t.payroll.compSaved });
      close(false);
    },
    onError: (refusal) => setError(describeApiError(refusal, t)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const percentBps = parsePercent(percent);
    const rentAmount = parseMoney(rent);
    const salaryAmount = parseMoney(salary);
    const complete =
      type === 'percent'
        ? percentBps !== null
        : type === 'chair_rent'
          ? rentAmount !== null
          : percentBps !== null && salaryAmount !== null;
    if (!complete || !effectiveFrom) {
      setError(t.payroll.compInvalid);
      return;
    }
    save.mutate({
      organizationMemberId: memberId,
      type,
      effectiveFrom,
      ...(type !== 'chair_rent' && percentBps !== null ? { percentBps } : {}),
      ...(type === 'chair_rent' && rentAmount !== null ? { rentAmount, rentPeriod } : {}),
      ...(type === 'salary_plus_percent' && salaryAmount !== null ? { salaryAmount } : {}),
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={t.payroll.compTitle}
      description={t.payroll.compHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {save.isPending ? t.common.saving : t.payroll.compSave}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-6">
        <div className="member-line">
          <span className="list-avatar" style={avatarTint(memberId)} aria-hidden="true">
            {initials(memberName)}
          </span>
          <b>{memberName}</b>
        </div>

        <SheetSection title={t.payroll.compType}>
          <RadioCards<CompensationType>
            name="compensation-type"
            value={type}
            onChange={(next) => {
              setError('');
              setType(next);
            }}
            options={[
              { value: 'percent', label: t.payroll.typePercent },
              { value: 'chair_rent', label: t.payroll.typeRent, hint: t.payroll.typeRentHint },
              { value: 'salary_plus_percent', label: t.payroll.typeSalary },
            ]}
          />
        </SheetSection>

        <div className="form-grid">
          {type === 'chair_rent' ? (
            <>
              <Field id="comp-rent" label={t.payroll.compRent}>
                <Input
                  id="comp-rent"
                  inputMode="decimal"
                  value={rent}
                  onChange={(event) => setRent(event.target.value)}
                />
              </Field>
              <Field id="comp-rent-period" label={t.payroll.compRentPeriod}>
                <Select
                  id="comp-rent-period"
                  value={rentPeriod}
                  onChange={(event) => setRentPeriod(event.target.value as RentPeriod)}
                >
                  <option value="day">{t.payroll.perDay}</option>
                  <option value="week">{t.payroll.perWeek}</option>
                  <option value="month">{t.payroll.perMonth}</option>
                </Select>
              </Field>
            </>
          ) : (
            <>
              {type === 'salary_plus_percent' ? (
                <Field id="comp-salary" label={t.payroll.compSalary}>
                  <Input
                    id="comp-salary"
                    inputMode="decimal"
                    value={salary}
                    onChange={(event) => setSalary(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field id="comp-percent" label={t.payroll.compPercent}>
                <span className="input-suffix">
                  <Input
                    id="comp-percent"
                    inputMode="decimal"
                    value={percent}
                    placeholder="50"
                    onChange={(event) => setPercent(event.target.value)}
                  />
                  <span aria-hidden="true">%</span>
                </span>
              </Field>
            </>
          )}
          <Field id="comp-from" label={t.payroll.compFrom}>
            <Input
              id="comp-from"
              type="date"
              required
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </Field>
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        {history.length ? (
          <SheetSection title={t.payroll.compHistory}>
            <dl className="terms-history">
              {history.map((row) => (
                <Fragment key={row.id}>
                  <dt>{formatCivilDay(row.effectiveFrom, locale)}</dt>
                  <dd>{row.label}</dd>
                </Fragment>
              ))}
            </dl>
          </SheetSection>
        ) : null}
      </form>
    </Sheet>
  );
}
