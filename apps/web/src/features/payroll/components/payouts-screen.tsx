'use client';

/**
 * Выплаты — ведомость за месяц (SALON.md §7.3–§7.4).
 *
 * Два режима одного экрана. Владелица выбирает месяц, нажимает «Рассчитать»
 * и видит каждого: доход, условия, сколько мастеру и сколько салону; дальше
 * «Утвердить» и «Выплачено». Мастер видит свой заработок — утверждённые и
 * выплаченные ведомости и свои условия; черновика ей не показывают.
 *
 * Суммы приходят снимком: пересчёт меняет только черновики, и экран прямо
 * говорит, сколько ведомостей он не тронул. Минус у аренды кресла показан
 * минусом — это реальность арендной модели, а не ошибка расчёта.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
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
import { currentTerms, describeTerms, monthBounds } from '../terms';

type Step = 'approve' | 'paid' | 'delete';

const STATUS_BADGE: Record<PayoutStatus, string> = {
  draft: 'badge b-neutral',
  approved: 'badge b-amber',
  paid: 'badge b-green',
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
  const ownTerms = currentTerms(
    (compensation.data ?? []).filter((row) => row.organizationMemberId === memberId),
    today,
  ).current;

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

  return (
    <>
      <PageHeader
        title={manage ? t.payroll.title : t.payroll.ownTitle}
        meta={manage ? t.payroll.hint : t.payroll.ownHint}
        actions={
          manage ? (
            <>
              <Input
                type="month"
                value={month}
                aria-label={t.payroll.period}
                onChange={(event) => event.target.value && setMonth(event.target.value)}
                className="w-auto"
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={calculate.isPending}
                onClick={() => calculate.mutate()}
              >
                {calculate.isPending ? t.payroll.calculating : t.payroll.calculate}
              </button>
            </>
          ) : undefined
        }
      />

      {!manage ? (
        <section className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <span className="t-label">{t.payroll.compTitle}</span>
          <p className="t-strong" style={{ marginTop: 6 }}>
            {ownTerms ? describeTerms(ownTerms, t, locale) : t.payroll.compNoneOwn}
          </p>
        </section>
      ) : null}

      {payouts.isError ? (
        <LoadError onRetry={() => void payouts.refetch()} />
      ) : payouts.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="t-meta">{manage ? t.payroll.empty : t.payroll.ownEmpty}</p>
      ) : (
        <div className="card bookings-table">
          <table className="table">
            <thead>
              <tr>
                <th>{manage ? t.payroll.colMember : t.payroll.colPeriod}</th>
                <th className="num">{t.payroll.colVisits}</th>
                <th className="num">{t.payroll.colRevenue}</th>
                <th className="num">{t.payroll.colMaster}</th>
                {manage ? <th className="num">{t.payroll.colSalon}</th> : null}
                <th>{t.payroll.colStatus}</th>
                {manage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((payout) => (
                <tr key={payout.id}>
                  <td data-label="" style={{ whiteSpace: 'normal' }}>
                    <span className="t-strong">
                      {manage
                        ? payout.memberName
                        : `${formatCivilDay(payout.periodStart, locale)} — ${formatCivilDay(payout.periodEnd, locale)}`}
                    </span>
                    {termsLine(payout).map((line) => (
                      <span className="t-meta" style={{ display: 'block' }} key={line}>
                        {line}
                      </span>
                    ))}
                  </td>
                  <td className="num" data-label={t.payroll.colVisits}>
                    {payout.bookingsCount}
                  </td>
                  <td className="num" data-label={t.payroll.colRevenue}>
                    {money(payout.revenueAmount, payout.currency)}
                  </td>
                  <td
                    className="num"
                    data-label={t.payroll.colMaster}
                    style={{
                      fontWeight: 600,
                      color: payout.masterAmount < 0 ? 'var(--danger)' : undefined,
                    }}
                  >
                    {money(payout.masterAmount, payout.currency)}
                  </td>
                  {manage ? (
                    <td className="num" data-label={t.payroll.colSalon}>
                      {money(payout.salonAmount, payout.currency)}
                    </td>
                  ) : null}
                  <td data-label={t.payroll.colStatus}>
                    <span className={STATUS_BADGE[payout.status]}>
                      <span className="dot" />
                      {statusLabel(payout.status, t)}
                    </span>
                  </td>
                  {manage ? (
                    <td data-label="">
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        {payout.status === 'draft' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={step.isPending}
                              onClick={() => step.mutate({ id: payout.id, action: 'approve' })}
                            >
                              {t.payroll.approve}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={step.isPending}
                              onClick={() => step.mutate({ id: payout.id, action: 'delete' })}
                            >
                              {t.payroll.deleteDraft}
                            </button>
                          </>
                        ) : payout.status === 'approved' ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={step.isPending}
                            onClick={() => step.mutate({ id: payout.id, action: 'paid' })}
                          >
                            {t.payroll.markPaid}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {anyNegative ? (
        <p className="t-meta" style={{ marginTop: 12 }}>
          {t.payroll.negativeHint}
        </p>
      ) : null}
      <p className="t-meta" style={{ marginTop: 12, maxWidth: '60ch' }}>
        {t.payroll.disclaimer}
      </p>
    </>
  );
}
