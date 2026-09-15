'use client';

/**
 * Выплаты — прототип «Кабинет 2026», экран `payouts`; SALON.md §7.3–§7.4.
 *
 * Два режима одного экрана. Владелица выбирает месяц, нажимает «Рассчитать»
 * и видит каждого: доход, условия, сколько мастеру и сколько салону; дальше
 * «Утвердить» и «Выплачено». Мастер видит свой заработок — последнюю
 * ведомость чернильной ячейкой, свои условия и утверждённые и выплаченные
 * ведомости; черновика ей не показывают.
 *
 * Суммы приходят снимком: пересчёт меняет только черновики, и экран прямо
 * говорит, сколько ведомостей он не тронул. Минус у аренды кресла показан
 * минусом — это реальность арендной модели, а не ошибка расчёта.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { FALLBACK_TIMEZONE, todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { formatCivilDay, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import {
  approvePayout,
  calculatePayouts,
  deletePayoutDraft,
  listCompensation,
  listPayouts,
  markPayoutPaid,
  type Payout,
  type PayoutStatus,
} from '../api';
import { currentTerms, describeTerms, monthBounds, monthLabel, shiftMonth } from '../terms';

type Step = 'approve' | 'paid' | 'delete';

/* Пилюля прототипа: черновик ждёт решения — янтарный, утверждённая —
   зелёная, выплаченная — розовая, дело закрыто. */
const STATUS_TONE: Record<PayoutStatus, 'warning' | 'success' | 'accent'> = {
  draft: 'warning',
  approved: 'success',
  paid: 'accent',
};

function statusLabel(status: PayoutStatus, t: Messages): string {
  if (status === 'draft') return t.payroll.statusDraft;
  if (status === 'approved') return t.payroll.statusApproved;
  return t.payroll.statusPaid;
}

export function PayoutsScreen({
  slug,
  mode,
  memberId,
}: {
  slug: string;
  mode: 'manage' | 'own';
  memberId: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;
  const toast = useToast();
  const cache = useQueryClient();
  const manage = mode === 'manage';

  const [today] = useState(() => todayKey(timeZone));
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const { start, end } = monthBounds(month);
  const listKey = manage ? ['payouts', slug, month] : ['payouts', slug, 'own'];

  const payouts = useQuery({
    queryKey: listKey,
    queryFn: () => (manage ? listPayouts(slug, { from: start, to: end }) : listPayouts(slug)),
  });
  const compensation = useQuery({
    queryKey: ['compensation', slug],
    queryFn: () => listCompensation(slug),
    enabled: !manage,
  });

  const fail = (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' });

  const calculate = useMutation({
    mutationFn: () => calculatePayouts(slug, start, end),
    onSuccess: (result) => {
      cache.setQueryData(listKey, result.payouts);
      if (result.lockedCount > 0) {
        toast({ message: fmt(t.payroll.lockedNote, { count: result.lockedCount }) });
      }
    },
    onError: fail,
  });

  const step = useMutation({
    mutationFn: ({ id, action }: { id: string; action: Step }) =>
      action === 'approve'
        ? approvePayout(slug, id)
        : action === 'paid'
          ? markPayoutPaid(slug, id)
          : deletePayoutDraft(slug, id),
    onSuccess: async (_, { action }) => {
      await cache.invalidateQueries({ queryKey: ['payouts', slug] });
      toast({
        message:
          action === 'approve'
            ? t.payroll.approvedDone
            : action === 'paid'
              ? t.payroll.paidDone
              : t.payroll.deletedDone,
      });
    },
    onError: fail,
  });

  const money = (value: number, currency: string) => formatPrice(value, currency, locale);
  const rows = payouts.data ?? [];
  const anyNegative = rows.some((row) => row.masterAmount < 0);
  const locked = rows.filter((row) => row.status !== 'draft').length;
  const ownTerms = currentTerms(
    (compensation.data ?? []).filter((row) => row.organizationMemberId === memberId),
    today,
  ).current;
  /* Последняя ведомость — по концу периода, а не по порядку ответа. */
  const latest = manage
    ? null
    : rows.reduce<Payout | null>(
        (last, row) => (!last || row.periodEnd > last.periodEnd ? row : last),
        null,
      );

  const periodOf = (payout: Payout) =>
    `${formatCivilDay(payout.periodStart, locale)} — ${formatCivilDay(payout.periodEnd, locale)}`;

  function termsLine(payout: Payout): string[] {
    return payout.breakdown.map((segment) => {
      const terms = segment.type
        ? describeTerms({ ...segment, type: segment.type, currency: payout.currency }, t, locale)
        : t.payroll.noTerms;
      return payout.breakdown.length > 1
        ? `${formatCivilDay(segment.from, locale)} — ${formatCivilDay(segment.to, locale)}: ${terms}`
        : terms;
    });
  }

  /* «август» — месяц словом без года: «Рассчитать август», «Ведомости за
     август», как в прототипе. Год уже стоит в строке с перелистыванием. */
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    new Date(`${month}-01T12:00:00Z`),
  );

  return (
    <>
      {manage ? (
        <nav className="row master-crumbs" aria-label={t.nav.finance}>
          <Link href={`/${slug}/dashboard/finance`}>{t.nav.finance}</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>{t.payroll.title}</span>
        </nav>
      ) : null}

      <PageHeader
        title={manage ? t.payroll.title : t.payroll.ownTitle}
        meta={manage ? t.payroll.hint : t.payroll.ownHint}
        actions={
          manage ? (
            <Button size="sm" disabled={calculate.isPending} onClick={() => calculate.mutate()}>
              <Icon name="refresh" className="ico-18" />
              <span>
                {calculate.isPending
                  ? t.payroll.calculating
                  : fmt(t.payroll.calculateMonth, { month: monthName })}
              </span>
            </Button>
          ) : undefined
        }
      />

      {manage ? (
        <div className="finance-toolbar">
          {/* Стрелки, а не `<input type="month">`: настольный Safari такого
              поля не рисует и оставляет пустую строку, в которую нужно
              набрать «2026-09» руками. */}
          <div className="payouts-month" role="group" aria-label={t.payroll.period}>
            <Button
              variant="ghost"
              size="pill"
              className="payouts-month__step"
              aria-label={t.payroll.prevMonth}
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
            >
              <Icon name="chevL" className="ico-18" />
            </Button>
            <span className="payouts-month__label" aria-live="polite">
              {monthLabel(month, locale)}
            </span>
            <Button
              variant="ghost"
              size="pill"
              className="payouts-month__step"
              aria-label={t.payroll.nextMonth}
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
            >
              <Icon name="chevR" className="ico-18" />
            </Button>
          </div>
          <span className="finance-toolbar__note">{t.payroll.disclaimer}</span>
        </div>
      ) : (
        <div className="payouts-own">
          {latest ? (
            <section className="income-card payouts-own__last" aria-labelledby="payouts-last">
              <p id="payouts-last" className="income-card__label">
                {t.payroll.lastPayout}
              </p>
              <p className="income-card__value">{money(latest.masterAmount, latest.currency)}</p>
              <p className="income-card__hint">
                {fmt(t.payroll.lastPayoutHint, {
                  period: periodOf(latest),
                  visits: latest.bookingsCount,
                  revenue: money(latest.revenueAmount, latest.currency),
                })}
              </p>
            </section>
          ) : null}
          <Card className="payouts-own__terms">
            <CardHeader>
              <div>
                <CardTitle>{t.payroll.compTitle}</CardTitle>
                {ownTerms ? (
                  <CardHint>
                    {fmt(t.payroll.compSince, {
                      date: formatCivilDay(ownTerms.effectiveFrom, locale),
                    })}
                  </CardHint>
                ) : null}
              </div>
            </CardHeader>
            {compensation.isPending ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <div className="payouts-terms">
                <span className="payouts-terms__chip">
                  {ownTerms ? describeTerms(ownTerms, t, locale) : t.payroll.compNoneOwn}
                </span>
                <span className="t-meta">{t.payroll.compHint}</span>
              </div>
            )}
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {manage
                ? fmt(t.payroll.sheetsTitleMonth, { month: monthName })
                : t.payroll.sheetsTitle}
            </CardTitle>
            {manage && locked > 0 ? (
              <CardHint>{fmt(t.payroll.lockedNote, { count: locked })}</CardHint>
            ) : null}
          </div>
        </CardHeader>

        {payouts.isError ? (
          <LoadError onRetry={() => void payouts.refetch()} />
        ) : payouts.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title={manage ? t.payroll.empty : t.payroll.ownEmpty} />
        ) : (
          <div className="list-table-wrap">
            <table className="list-table">
              <thead>
                <tr>
                  <th>{manage ? t.payroll.colMember : t.payroll.colPeriod}</th>
                  {manage ? <th>{t.payroll.colPeriod}</th> : null}
                  <th className="r">{t.payroll.colVisits}</th>
                  <th className="r">{t.payroll.colRevenue}</th>
                  <th className="r">{t.payroll.colMaster}</th>
                  {manage ? <th className="r">{t.payroll.colSalon}</th> : null}
                  <th>{t.payroll.colStatus}</th>
                  {manage ? <th aria-hidden="true" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((payout) => {
                  const period = periodOf(payout);
                  return (
                    <tr key={payout.id}>
                      <td>
                        <span className="cellname">
                          {manage ? (
                            <span
                              className="list-avatar"
                              style={avatarTint(payout.organizationMemberId)}
                              aria-hidden="true"
                            >
                              {initials(payout.memberName)}
                            </span>
                          ) : null}
                          <span className="cellname__text">
                            <span className="cellname__title">
                              {manage ? payout.memberName : period}
                            </span>
                            {/* На телефоне колонки «Период» нет — он под именем. */}
                            {manage ? <small className="m-only">{period}</small> : null}
                            {termsLine(payout).map((line) => (
                              <small key={line}>{line}</small>
                            ))}
                          </span>
                        </span>
                      </td>
                      {manage ? <td className="hide-m">{period}</td> : null}
                      <td className="hide-m r">{payout.bookingsCount}</td>
                      <td className="hide-m r">{money(payout.revenueAmount, payout.currency)}</td>
                      <td
                        className={payout.masterAmount < 0 ? 'r m-right is-negative' : 'r m-right'}
                      >
                        <b>{money(payout.masterAmount, payout.currency)}</b>
                      </td>
                      {manage ? (
                        <td className="hide-m r">{money(payout.salonAmount, payout.currency)}</td>
                      ) : null}
                      <td className="m-status">
                        <Badge tone={STATUS_TONE[payout.status]}>
                          {statusLabel(payout.status, t)}
                        </Badge>
                      </td>
                      {manage ? (
                        <td className="m-acts">
                          <div className="payouts-acts">
                            {payout.status === 'draft' ? (
                              <Button
                                variant="secondary"
                                size="pill"
                                disabled={step.isPending}
                                onClick={() => step.mutate({ id: payout.id, action: 'approve' })}
                              >
                                <Icon name="check" className="ico-16" />
                                <span>{t.payroll.approve}</span>
                              </Button>
                            ) : payout.status === 'approved' ? (
                              <Button
                                variant="secondary"
                                size="pill"
                                disabled={step.isPending}
                                onClick={() => step.mutate({ id: payout.id, action: 'paid' })}
                              >
                                {t.payroll.markPaid}
                              </Button>
                            ) : null}
                            {payout.status === 'draft' ? (
                              <RowMenu label={`${t.payroll.rowActions}: ${payout.memberName}`}>
                                <button
                                  type="button"
                                  className="is-danger"
                                  disabled={step.isPending}
                                  onClick={() => step.mutate({ id: payout.id, action: 'delete' })}
                                >
                                  <Icon name="trash" className="ico-16" />
                                  <span>{t.payroll.deleteDraft}</span>
                                </button>
                              </RowMenu>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {anyNegative ? <p className="finance-disclaimer">{t.payroll.negativeHint}</p> : null}
      {manage ? null : <p className="finance-disclaimer">{t.payroll.disclaimer}</p>}
    </>
  );
}
