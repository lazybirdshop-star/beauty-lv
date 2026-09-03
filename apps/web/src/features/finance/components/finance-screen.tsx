/**
 * «Финансы» — по артборду `Finance.dc.html`.
 *
 * Слева доход: крупное число, тот же период месяцем раньше и столбики, из
 * которых сумма сложилась; под ними — чем кончились записи периода. Справа
 * разбивка по услугам таблицей. Ниже — записи, из которых сумма и состоит:
 * число без списка, который его объясняет, приходится принимать на веру.
 *
 * Экран серверный: каждая цифра приезжает уже посчитанной за нужный срок,
 * период живёт в адресе (`?period=`), а не в состоянии компонента.
 */
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { formatPrice } from '@/lib/format';
import { fmt, plural } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

import type { FinancePeriod } from '../period';
import type { FinanceSummary } from '../types';
import { CompletedTable, type CompletedRow } from './completed-table';
import { FinanceExport } from './finance-export';
import { PeriodSwitch } from './period-switch';
import { RevenueBars } from './revenue-bars';

/**
 * Насколько доход отличается от предыдущего такого же срока.
 *
 * Сама сумма мастеру почти ничего не говорит: «3 200 €» — это много или мало?
 * Ответ даёт только сравнение, поэтому под числом стоит не «завершённые
 * записи», а движение относительно прошлого периода.
 *
 * Четыре случая, и три из них — не проценты. Рост с нуля не «+∞%», а «первый
 * период с доходом»; равные суммы не «+0%», а «как в прошлом»; «всё время»
 * сравнивать не с чем вовсе.
 */
function revenueTrend(summary: FinanceSummary, t: Messages): string {
  const previous = summary.previousRevenue;
  if (previous === null) return t.finance.revenueHint;
  if (previous === 0)
    return summary.totalRevenue > 0 ? t.finance.vsPreviousNew : t.finance.revenueHint;

  const delta = summary.totalRevenue - previous;
  if (delta === 0) return t.finance.vsPreviousSame;

  const percent = Math.round((Math.abs(delta) / previous) * 100);
  // Округление вниз до нуля («+0%») читалось бы как «без изменений» при росте.
  if (percent === 0)
    return delta > 0
      ? t.finance.vsPreviousUp.replace('{percent}', '<1')
      : t.finance.vsPreviousDown.replace('{percent}', '<1');

  return fmt(delta > 0 ? t.finance.vsPreviousUp : t.finance.vsPreviousDown, { percent });
}

export function FinanceScreen({
  summary,
  completed,
  t,
  locale,
  period,
  basePath,
  slug,
}: {
  summary: FinanceSummary;
  /** Записи, из которых сложилась сумма, — новые первыми. */
  completed: CompletedRow[];
  t: Messages;
  locale: string;
  period: FinancePeriod;
  basePath: string;
  slug: string;
}) {
  const money = (value: number) => formatPrice(value, summary.currency, locale);

  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' });
  const monthLong = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

  const bars = summary.byMonth.map((entry) => {
    const date = new Date(`${entry.month}-01T00:00:00`);
    return {
      key: entry.month,
      label: monthShort.format(date).replace('.', ''),
      title: `${monthLong.format(date)} · ${money(entry.revenue)}`,
      value: entry.revenue,
    };
  });

  /* Лучший месяц периода — подпись под столбиками. У одного столбика лучшего
     нет: «лучший из одного» ничего не сообщает. */
  const best = bars.length > 1 ? bars.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  return (
    <>
      <PageHeader
        title={t.nav.finance}
        actions={
          <FinanceExport rows={completed} currency={summary.currency} slug={slug} period={period} />
        }
      />

      <div className="bookings-filters">
        <PeriodSwitch basePath={basePath} current={period} t={t} />
        {/* Что именно посчитано — рядом с числом, а не в подвале экрана: это
            не оговорка, а определение суммы. */}
        <span className="bookings-count">{t.finance.disclaimerShort}</span>
      </div>

      <div className="finance-grid">
        <section className="card" style={{ padding: '18px 20px 16px' }}>
          <span className="t-label">{t.finance.revenue}</span>
          <div className="t-metric" style={{ marginTop: 6 }}>
            {money(summary.totalRevenue)}
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            {revenueTrend(summary, t)}
          </div>

          <RevenueBars bars={bars} bestKey={best?.key ?? null} emptyLabel={t.common.chartEmpty} />

          <div className="finance-foot">
            <span>
              <b>{summary.completedCount}</b> {t.finance.completedWord}
            </span>
            <span>
              <b>{summary.cancelledCount}</b>{' '}
              {plural(locale, summary.cancelledCount, {
                zero: t.finance.cancelledCountMany,
                one: t.finance.cancelledCountOne,
                few: t.finance.cancelledCountFew,
                many: t.finance.cancelledCountMany,
                other: t.finance.cancelledCountMany,
              })}
            </span>
            <span>
              <b>{summary.noShowCount}</b>{' '}
              {plural(locale, summary.noShowCount, {
                zero: t.finance.noShowCountMany,
                one: t.finance.noShowCountOne,
                few: t.finance.noShowCountFew,
                many: t.finance.noShowCountMany,
                other: t.finance.noShowCountMany,
              })}
            </span>
            {best ? (
              <span style={{ marginLeft: 'auto' }} className="t-meta">
                {fmt(t.finance.bestMonth, { month: best.label, amount: money(best.value) })}
              </span>
            ) : null}
          </div>
        </section>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ paddingBottom: 12 }}>
            <span className="t-section" style={{ fontSize: 15 }}>
              {t.finance.servicesByRevenue}
            </span>
          </div>
          {summary.byService.length === 0 ? (
            <p className="t-meta" style={{ padding: '0 18px 18px' }}>
              {t.finance.noCompleted}
            </p>
          ) : (
            <table className="table dense">
              <thead>
                <tr>
                  <th>{t.services.colService}</th>
                  <th className="num" style={{ width: 90 }}>
                    {t.finance.colBookings}
                  </th>
                  <th className="num" style={{ width: 100 }}>
                    {t.finance.revenue}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.byService.map((service) => (
                  <tr key={service.serviceName}>
                    <td style={{ whiteSpace: 'normal' }}>{service.serviceName}</td>
                    <td className="num">{service.bookings}</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {money(service.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <CompletedTable
        rows={completed}
        total={money(summary.totalRevenue)}
        currency={summary.currency}
        locale={locale}
        t={t}
      />

      {/* Сказано прямо: это не бухгалтерия, и платежей у продукта нет. */}
      <p className="t-meta" style={{ marginTop: 14, maxWidth: '60ch' }}>
        {t.finance.disclaimer}
      </p>
    </>
  );
}
