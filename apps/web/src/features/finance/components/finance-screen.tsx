/**
 * «Финансы» — прототип «Кабинет 2026», экран `finance`.
 *
 * Двенадцать колонок, ячейки по шесть. Слева — чернильная ячейка дохода:
 * сумма антиквой, движение к прошлому такому же сроку и из чего она
 * сложилась — по дням месяца или столбиками по месяцам. Справа — средний
 * чек, отмены и услуги по доходу полосами. Ниже — мастера по доходу у салона
 * с командой и завершённые записи: число без списка, который его объясняет,
 * приходится принимать на веру.
 *
 * Экран серверный: каждая цифра приезжает уже посчитанной за нужный срок,
 * период живёт в адресе (`?period=`), а не в состоянии компонента.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { avatarTint, initials } from '@/lib/avatar';
import { formatPrice } from '@/lib/format';
import { fmt, plural } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

import { monthDays } from '../daily-revenue';
import type { FinancePeriod } from '../period';
import type { FinanceSummary } from '../types';
import { CompletedTable, type CompletedRow } from './completed-table';
import { FinanceExport } from './finance-export';
import { PeriodSwitch, periodLabel } from './period-switch';
import { RevenueBars } from './revenue-bars';
import { RevenueHeat } from './revenue-heat';

/** Услуг полосами — пять: дальше полосы короче подписи, остаток — строкой. */
const TOP_SERVICES = 5;

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
  today,
  hasTeam = false,
  payoutsHref,
}: {
  summary: FinanceSummary;
  /** Записи, из которых сложилась сумма, — новые первыми. */
  completed: CompletedRow[];
  t: Messages;
  locale: string;
  period: FinancePeriod;
  basePath: string;
  slug: string;
  /** Сегодня в поясе салона, `YYYY-MM-DD`: делит месяц на прошедшие и будущие дни. */
  today: string;
  /** У салона с командой у записи есть колонка «Мастер». */
  hasTeam?: boolean;
  /** Ведомость — у владелицы салона с командой; у остальных ссылки нет. */
  payoutsHref?: string;
}) {
  const money = (value: number) => formatPrice(value, summary.currency, locale);
  const countWord = (count: number, one: string, few: string, many: string) =>
    plural(locale, count, { zero: many, one, few, many, other: many });

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

  /* Срок словами у заголовков ячеек: «сентябрь» у месяца, «3 месяца» у
     квартала — «Доход · месяц» не сообщал бы, какой. */
  const periodName =
    period === 'month'
      ? new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
          new Date(`${today.slice(0, 7)}-01T00:00:00Z`),
        )
      : periodLabel(period, t).toLocaleLowerCase(locale);

  let chart: ReactNode = null;
  if (period === 'month') {
    /* Месяц — по дням: столбик по месяцам был бы один, у левого края, а
       сумма и так написана над ним крупно. Пустой месяц говорит словами, а
       не тридцатью чертами. */
    if (summary.totalRevenue === 0) {
      chart = <p className="finance-bars finance-bars--empty">{t.common.chartEmpty}</p>;
    } else {
      const days = monthDays(today, completed);
      const dayFormat = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
      const nameOf = (key: string) =>
        dayFormat.format(new Date(`${key}T00:00:00Z`)).replace('.', '');
      chart = (
        <RevenueHeat
          days={days}
          titles={days.map((day) => `${nameOf(day.key)} · ${money(day.revenue)}`)}
          label={t.finance.heatLabel}
          caption={[
            nameOf(days[0]!.key),
            fmt(t.finance.heatToday, { day: Number(today.slice(8, 10)) }),
            nameOf(days[days.length - 1]!.key),
          ]}
        />
      );
    }
  } else if (bars.length !== 1) {
    /* Столбики — когда есть что сравнивать: у «всего времени» с одним
       месяцем истории столбик один, и значение по нему не считывается. */
    chart = (
      <RevenueBars
        bars={bars}
        currentKey={bars.length ? bars[bars.length - 1]!.key : null}
        label={t.finance.revenueByMonthCaption}
        emptyLabel={t.common.chartEmpty}
      />
    );
  }

  /* Сумма в копейках, округлённая до целой валюты — для средних. */
  const wholeUnits = (minor: number) => Math.round(minor / 100) * 100;

  const topServices = summary.byService.slice(0, TOP_SERVICES);
  const restServices = summary.byService.slice(TOP_SERVICES);
  const serviceMax = Math.max(1, ...topServices.map((service) => service.revenue));

  /* Мастера — со второго человека с доходом: разбивка из одной строки
     повторяет сумму над ней и ничего не сравнивает (SL-10). */
  const showMembers = summary.byMember.length > 1;
  const memberNames = hasTeam
    ? Object.fromEntries(
        summary.byMember.map((row) => [
          row.organizationMemberId,
          row.name.split(' ')[0] ?? row.name,
        ]),
      )
    : undefined;
  const finished = summary.completedCount + summary.cancelledCount + summary.noShowCount;

  return (
    <>
      <PageHeader
        title={t.nav.finance}
        meta={t.finance.pageHint}
        actions={
          <>
            {/* Ведомость живёт в заголовке «Мастера по доходу»; без этой
                ячейки дорога к ней остаётся в шапке. */}
            {payoutsHref && !showMembers ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={payoutsHref}>{t.payroll.title}</Link>
              </Button>
            ) : null}
            <FinanceExport
              rows={completed}
              currency={summary.currency}
              slug={slug}
              period={period}
            />
          </>
        }
      />

      <div className="finance-toolbar">
        <PeriodSwitch basePath={basePath} current={period} t={t} />
        {/* Что именно посчитано — рядом с числом, а не в подвале экрана: это
            не оговорка, а определение суммы. */}
        <span className="finance-toolbar__note">{t.finance.disclaimerShort}</span>
      </div>

      <div className="finance-grid">
        <section className="income-card finance-hero" aria-labelledby="finance-revenue">
          <p id="finance-revenue" className="income-card__label">
            {t.finance.revenue} · {periodName}
          </p>
          <p className="income-card__value finance-hero__value">{money(summary.totalRevenue)}</p>
          <p className="income-card__hint">
            <span>{revenueTrend(summary, t)}</span>
            {summary.completedCount > 0 ? (
              <span>
                {' · '}
                {summary.completedCount}{' '}
                {countWord(
                  summary.completedCount,
                  t.finance.visitCountOne,
                  t.finance.visitCountFew,
                  t.finance.visitCountMany,
                )}
              </span>
            ) : null}
          </p>
          {chart ? <div className="finance-hero__chart">{chart}</div> : null}
        </section>

        <div className="finance-side">
          <Card>
            <p className="stat-cell__label">{t.finance.averageCheck}</p>
            {/* Средний чек — целыми, как в прототипе: «41 €». Копейки среднего
                ничего не говорят, а цифру делают шумной. */}
            <p className="stat-cell__value">{money(wholeUnits(summary.averageCheck))}</p>
            <p className="stat-cell__hint">{t.finance.averageCheckHint}</p>
          </Card>
          <Card>
            <p className="stat-cell__label">{t.finance.cancellations}</p>
            <p className="stat-cell__value">{summary.cancelledCount + summary.noShowCount}</p>
            <p className="stat-cell__hint">
              {fmt(t.finance.cancellationsHint, {
                cancelled: `${summary.cancelledCount} ${countWord(
                  summary.cancelledCount,
                  t.finance.cancelledCountOne,
                  t.finance.cancelledCountFew,
                  t.finance.cancelledCountMany,
                )}`,
                noShow: `${summary.noShowCount} ${countWord(
                  summary.noShowCount,
                  t.finance.noShowCountOne,
                  t.finance.noShowCountFew,
                  t.finance.noShowCountMany,
                )}`,
                total: finished,
              })}
            </p>
          </Card>

          <Card className="finance-side__wide">
            <CardHeader>
              <div>
                <CardTitle>{t.finance.servicesByRevenue}</CardTitle>
                <CardHint>{periodName}</CardHint>
              </div>
            </CardHeader>
            {topServices.length === 0 ? (
              <p className="t-meta">{t.finance.noCompleted}</p>
            ) : (
              <div className="hbars">
                {topServices.map((service) => (
                  <div className="hbar" key={service.serviceName}>
                    <span className="hbar__name">
                      {service.serviceName} <span className="muted">· {service.bookings}</span>
                    </span>
                    <span className="hbar__val tnum">{money(service.revenue)}</span>
                    <span className="hbar__track">
                      <i
                        style={{ width: `${Math.round((service.revenue / serviceMax) * 100)}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {restServices.length ? (
              <p className="finance-more">
                {fmt(t.finance.moreServices, {
                  count: restServices.length,
                  amount: money(restServices.reduce((sum, service) => sum + service.revenue, 0)),
                })}
              </p>
            ) : null}
          </Card>
        </div>

        {showMembers ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.finance.membersByRevenue}</CardTitle>
                <CardHint>{periodName}</CardHint>
              </div>
              {payoutsHref ? (
                <Link className="cell-link" href={payoutsHref}>
                  {t.payroll.title}
                </Link>
              ) : null}
            </CardHeader>
            <div className="list-table-wrap">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>{t.finance.colMember}</th>
                    <th className="r">{t.finance.colBookings}</th>
                    <th className="r">{t.finance.colAverage}</th>
                    <th className="r">{t.finance.revenue}</th>
                    <th className="r">{t.finance.colShare}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byMember.map((member) => {
                    const share =
                      summary.totalRevenue > 0
                        ? `${Math.round((member.revenue / summary.totalRevenue) * 100)}%`
                        : '—';
                    return (
                      <tr key={member.organizationMemberId}>
                        <td>
                          <span className="cellname">
                            <span
                              className="list-avatar"
                              style={avatarTint(member.organizationMemberId)}
                              aria-hidden="true"
                            >
                              {initials(member.name)}
                            </span>
                            <span className="cellname__text">
                              <Link
                                className="cellname__title"
                                href={`/${slug}/dashboard/team/${member.organizationMemberId}`}
                              >
                                {member.name.split(' ')[0] ?? member.name}
                              </Link>
                              <small className="m-only tnum">
                                {member.bookings}{' '}
                                {countWord(
                                  member.bookings,
                                  t.finance.visitCountOne,
                                  t.finance.visitCountFew,
                                  t.finance.visitCountMany,
                                )}{' '}
                                · {share}
                              </small>
                            </span>
                          </span>
                        </td>
                        <td className="hide-m r">{member.bookings}</td>
                        <td className="hide-m r">
                          {money(
                            member.bookings > 0 ? wholeUnits(member.revenue / member.bookings) : 0,
                          )}
                        </td>
                        <td className="r m-right">
                          <b>{money(member.revenue)}</b>
                        </td>
                        <td className="hide-m r muted">{share}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <CompletedTable
          rows={completed}
          total={money(summary.totalRevenue)}
          currency={summary.currency}
          memberNames={memberNames}
          className={showMembers ? undefined : 'finance-grid__full'}
        />
      </div>

      {/* Сказано прямо: это не бухгалтерия, и платежей у продукта нет. */}
      <p className="finance-disclaimer">{t.finance.disclaimer}</p>
    </>
  );
}
