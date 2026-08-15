import { fmt } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';
import { BarChart, type BarChartPoint } from '@/components/ui/bar-chart';
import { Card, CardLabel } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { formatPrice } from '@/lib/format';

import type { FinanceSummary } from '../types';

function monthPoints(summary: FinanceSummary, locale: string): BarChartPoint[] {
  const monthShortFmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  const monthLongFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  return summary.byMonth.map((entry) => {
    const date = new Date(`${entry.month}-01T00:00:00`);
    return {
      label: monthShortFmt.format(date).replace('.', ''),
      title: monthLongFmt.format(date),
      value: entry.revenue,
    };
  });
}

export function FinanceScreen({
  summary,
  t,
  locale,
}: {
  summary: FinanceSummary;
  t: Messages;
  locale: string;
}) {
  const money = (value: number) => formatPrice(value, summary.currency);

  const finishedTotal = summary.completedCount + summary.cancelledCount + summary.noShowCount;
  // Share of everything that reached a terminal state, not of all bookings —
  // pending ones haven't had the chance to be cancelled yet.
  const cancellationRate =
    finishedTotal > 0
      ? Math.round(((summary.cancelledCount + summary.noShowCount) / finishedTotal) * 100)
      : 0;

  const topService = summary.byService[0];
  const maxServiceRevenue = topService?.revenue ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <StatTile
          label={t.finance.revenue}
          value={money(summary.totalRevenue)}
          hint={t.finance.revenueHint}
          emphasis="lead"
        />
        <StatTile
          label={t.finance.averageCheck}
          value={money(summary.averageCheck)}
          hint={t.finance.averageCheckHint}
        />
        <StatTile
          label={t.finance.cancellations}
          value={`${cancellationRate}%`}
          hint={fmt(t.finance.cancellationsHint, {
            cancelled: summary.cancelledCount,
            noShow: summary.noShowCount,
          })}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Card className="flex flex-col gap-4">
        <CardLabel>{t.finance.revenueByMonth}</CardLabel>
        <BarChart
          data={monthPoints(summary, locale)}
          formatValue={money}
          caption={t.finance.revenueByMonthCaption}
          emptyLabel={t.common.chartEmpty}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <CardLabel>{t.finance.servicesByRevenue}</CardLabel>
        {summary.byService.length === 0 ? (
          <p className="rounded-2xl bg-bg-sunken/70 px-4 py-8 text-center text-sm text-ink-soft">
            {t.finance.noCompleted}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {summary.byService.map((service) => (
              <li key={service.serviceName} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
                    {service.serviceName}
                  </span>
                  <span className="shrink-0 font-display text-base text-ink">
                    {money(service.revenue)}
                  </span>
                </div>
                {/* Horizontal magnitude bar — same single-series accent, so the
                    row's own label carries identity. */}
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${maxServiceRevenue > 0 ? (service.revenue / maxServiceRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-ink-soft">
                  {fmt(t.finance.visitsCount, { count: service.bookings })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Said plainly: this is not bookkeeping, and the product has no payments. */}
      <p className="px-1 text-xs leading-relaxed text-ink-soft">{t.finance.disclaimer}</p>
    </div>
  );
}
