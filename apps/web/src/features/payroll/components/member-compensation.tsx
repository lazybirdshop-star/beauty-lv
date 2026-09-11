'use client';

/**
 * Условия расчёта с мастером — на его странице (SALON.md §7.2).
 *
 * Новые условия не правят старые, а начинают действовать с даты: поднятый
 * процент не переписывает уже согласованный месяц. Поэтому форма здесь одна —
 * «новые условия с такого-то дня», — а сменить или удалить действующие нельзя
 * вовсе. История видна целиком: на вопрос «с какого числа у Юли 50 %» ответ
 * должен быть на экране, а не в памяти владелицы.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { FALLBACK_TIMEZONE, todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import {
  createCompensation,
  listCompensation,
  type CompensationInput,
  type CompensationType,
  type RentPeriod,
} from '../api';
import { currentTerms, describeTerms, parseMoney, parsePercent } from '../terms';

export function MemberCompensation({ slug, memberId }: { slug: string; memberId: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;
  const toast = useToast();
  const cache = useQueryClient();

  const [today] = useState(() => todayKey(timeZone));
  const [type, setType] = useState<CompensationType>('percent');
  const [percent, setPercent] = useState('');
  const [rent, setRent] = useState('');
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>('month');
  const [salary, setSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['compensation', slug],
    queryFn: () => listCompensation(slug),
  });

  const save = useMutation({
    mutationFn: (input: CompensationInput) => createCompensation(slug, input),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['compensation', slug] });
      toast({ message: t.payroll.compSaved });
      setPercent('');
      setRent('');
      setSalary('');
    },
    onError: (refusal) => setError(describeApiError(refusal, t)),
  });

  const mine = (query.data ?? []).filter((row) => row.organizationMemberId === memberId);
  const { current, upcoming } = currentTerms(mine, today);
  const history = [...mine].sort(
    (a, b) =>
      b.effectiveFrom.localeCompare(a.effectiveFrom) || b.createdAt.localeCompare(a.createdAt),
  );

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
    <section className="card member-card" aria-labelledby="member-compensation">
      <div className="member-card__head">
        <h2 id="member-compensation" className="t-section">
          {t.payroll.compTitle}
        </h2>
        <p className="t-meta">{t.payroll.compHint}</p>
      </div>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="col" style={{ gap: 6 }}>
          <span className="t-strong">
            {current ? describeTerms(current, t, locale) : t.payroll.compNone}
          </span>
          {current ? (
            <span className="t-meta">
              {fmt(t.payroll.compSince, { date: formatCivilDay(current.effectiveFrom, locale) })}
            </span>
          ) : null}
          {upcoming.map((row) => (
            <span className="t-meta" key={row.id}>
              {fmt(t.payroll.compUpcoming, {
                date: formatCivilDay(row.effectiveFrom, locale),
                terms: describeTerms(row, t, locale),
              })}
            </span>
          ))}
        </div>
      )}

      <div className="divider" />

      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <span className="t-label">{t.payroll.compNew}</span>
        <Select
          aria-label={t.payroll.compType}
          value={type}
          onChange={(event) => {
            setError('');
            setType(event.target.value as CompensationType);
          }}
        >
          <option value="percent">{t.payroll.typePercent}</option>
          <option value="chair_rent">{t.payroll.typeRent}</option>
          <option value="salary_plus_percent">{t.payroll.typeSalary}</option>
        </Select>

        {type === 'salary_plus_percent' ? (
          <label className="col" style={{ gap: 6 }}>
            <span className="t-meta">{t.payroll.compSalary}</span>
            <Input
              inputMode="decimal"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
            />
          </label>
        ) : null}

        {type === 'chair_rent' ? (
          <div className="member-name-form">
            <label className="col" style={{ gap: 6 }}>
              <span className="t-meta">{t.payroll.compRent}</span>
              <Input
                inputMode="decimal"
                value={rent}
                onChange={(event) => setRent(event.target.value)}
              />
            </label>
            <label className="col" style={{ gap: 6 }}>
              <span className="t-meta">{t.payroll.compRentPeriod}</span>
              <Select
                value={rentPeriod}
                onChange={(event) => setRentPeriod(event.target.value as RentPeriod)}
              >
                <option value="day">{t.payroll.perDay}</option>
                <option value="week">{t.payroll.perWeek}</option>
                <option value="month">{t.payroll.perMonth}</option>
              </Select>
            </label>
          </div>
        ) : (
          <label className="col" style={{ gap: 6 }}>
            <span className="t-meta">{t.payroll.compPercent}</span>
            <Input
              inputMode="decimal"
              value={percent}
              placeholder="45"
              onChange={(event) => setPercent(event.target.value)}
            />
          </label>
        )}

        <label className="col" style={{ gap: 6 }}>
          <span className="t-meta">{t.payroll.compFrom}</span>
          <Input
            type="date"
            required
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
          disabled={save.isPending}
        >
          {t.payroll.compSave}
        </button>
        {error ? <FieldError>{error}</FieldError> : null}
      </form>

      {history.length > 1 ? (
        <details>
          <summary className="t-meta" style={{ cursor: 'pointer' }}>
            {t.payroll.compHistory}
          </summary>
          <ul className="col" style={{ gap: 6, marginTop: 8, padding: 0, listStyle: 'none' }}>
            {history.map((row) => (
              <li key={row.id} className="t-meta">
                {formatCivilDay(row.effectiveFrom, locale)} · {describeTerms(row, t, locale)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
