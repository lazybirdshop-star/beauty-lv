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
import { initials, teamTones } from '@/lib/avatar';
import { formatDayShort, formatPrice } from '@/lib/format';
import { fmt, plural } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

import { chairHourRate } from '../chair-hour';
import { rateVerdict, type ServiceRate } from '../service-yield';
import { sharePercents } from '../shares';
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
  rates = [],
  t,
  locale,
  period,
  basePath,
  slug,
  today,
  hasTeam = false,
  memberOrder,
  payoutsHref,
}: {
  summary: FinanceSummary;
  /** Записи, из которых сложилась сумма, — новые первыми. */
  completed: CompletedRow[];
  /** Услуги периода с ценой их часа кресла — считает страница, по тем же визитам. */
  rates?: ServiceRate[];
  t: Messages;
  locale: string;
  period: FinancePeriod;
  basePath: string;
  slug: string;
  /** Сегодня в поясе салона, `YYYY-MM-DD`: делит месяц на прошедшие и будущие дни. */
  today: string;
  /** У салона с командой у записи есть колонка «Мастер». */
  hasTeam?: boolean;
  /**
   * Состав салона в том же порядке, в каком его видят остальные экраны.
   *
   * `teamTones` разводит столкновения по порядку списка, поэтому от
   * подмножества ответ меняется: считая карту по тем, у кого был доход, экран
   * красил Maija персиковым при розовой дорожке на Главной (критика
   * 2026-09-25). Порядок приходит со страницы, где известен весь состав.
   */
  memberOrder?: string[];
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

  /* Месяц по дням — тот же график и для «всего времени» с одной месячной
     историей: столбик там был бы один, а карточка дохода оставалась пустой
     наполовину (критика 2026-09-27). Рисуется он только для текущего месяца:
     `monthDays` считает дни от сегодняшнего дня, и на прошлый месяц его
     натянуть нельзя. */
  const monthHeat = () => {
    const days = monthDays(today, completed);
    /* «1 сен» — три буквы месяца без точки, как везде в кабинете. */
    const nameOf = (key: string) => formatDayShort(`${key}T12:00:00Z`, locale, 'UTC', false);
    /* Вершина срока — единственное названное значение полосы: по ней
       читаются высоты всех остальных дней. */
    const best = days.reduce(
      (top, day) => (day.revenue > top.revenue ? day : top),
      days[0] ?? { key: today, day: 0, revenue: 0, isToday: false, isFuture: false },
    );
    return (
      <RevenueHeat
        days={days}
        peak={
          best.revenue > 0
            ? fmt(t.finance.heatPeak, { day: nameOf(best.key), amount: money(best.revenue) })
            : null
        }
        titles={days.map((day) => `${nameOf(day.key)} · ${money(day.revenue)}`)}
        label={t.finance.heatLabel}
        caption={[
          nameOf(days[0]!.key),
          fmt(t.finance.heatToday, { day: Number(today.slice(8, 10)) }),
          nameOf(days[days.length - 1]!.key),
        ]}
      />
    );
  };

  let chart: ReactNode = null;
  if (period === 'month') {
    /* Пустой месяц говорит словами, а не тридцатью чертами. */
    chart =
      summary.totalRevenue === 0 ? (
        <p className="finance-bars finance-bars--empty">{t.common.chartEmpty}</p>
      ) : (
        monthHeat()
      );
  } else if (bars.length === 1 && bars[0]!.key === today.slice(0, 7)) {
    chart = summary.totalRevenue === 0 ? null : monthHeat();
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
  /* Доли мастеров — целыми процентами, которые в сумме дают ровно сто. */
  const memberShares = sharePercents(summary.byMember.map((row) => row.revenue));
  /* Цена часа кресла — по тем же завершённым визитам, что дали сумму. */
  const chairHour = chairHourRate(summary.totalRevenue, completed);
  /* Вердикт по услугам: экран не просто считает час кресла, а называет, какая
     услуга держит время дешевле всех. Молчит, когда сравнивать нечего. */
  const verdict = rateVerdict(rates);
  /* Тон мастера — из карты всего состава, а не из тех, у кого был доход.
     `teamTones` разводит столкновения по порядку списка, поэтому от подмножества
     ответ меняется: в таблице дохода Maija оказывалась персиковой при розовой
     дорожке на Главной (критика 2026-09-25, повтор находки). Карта строится по
     ростеру, а доход лишь читает из неё. */
  const memberTones = teamTones(
    memberOrder?.length ? memberOrder : summary.byMember.map((row) => row.organizationMemberId),
  );
  const memberNames = hasTeam
    ? Object.fromEntries(
        summary.byMember.map((row) => [
          row.organizationMemberId,
          row.name.split(' ')[0] ?? row.name,
        ]),
      )
    : undefined;
  const finished = summary.completedCount + summary.cancelledCount + summary.noShowCount;

  /* Таблица мастеров объявлена отдельно: она стоит в левой колонке под
     доходом, а строится из тех же долей, что посчитаны выше. */
  const membersTable = (
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
            {summary.byMember.map((member, index) => {
              /* Доли считаются разом, а не построчно: поштучное
                   округление не держало сумму, и таблица показывала 101%. */
              const share = summary.totalRevenue > 0 ? `${memberShares[index]}%` : '—';
              return (
                <tr key={member.organizationMemberId}>
                  <td>
                    <span className="cellname">
                      <span
                        className="list-avatar"
                        style={{
                          background: `var(--tone-${memberTones[member.organizationMemberId]}-soft)`,
                          color: `var(--tone-${memberTones[member.organizationMemberId]}-ink)`,
                        }}
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
                    {money(member.bookings > 0 ? wholeUnits(member.revenue / member.bookings) : 0)}
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
  );

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
        {/* Три пояса, а не две колонки: ряд сетки тянется по самой высокой
            ячейке, и пара «короткий доход — высокая стопка справа» оставляла
            под доходом 365 px пустоты (критика 2026-09-27). Пояса сводят в
            ряд карточки сопоставимой высоты: доход и плитки, услуги и
            мастера, список завершённых во всю ширину. */}
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
          {/* Цена часа кресла. Сумма говорит «сколько заработано», средний чек
              «сколько приносит визит», и ни один не отвечает, дорого ли стоит
              само время: час стрижек и час окрашивания приносят разное. Эта
              мера сравнивает услуги и периоды на одной шкале. */}
          {chairHour === null ? null : (
            <Card>
              <p className="stat-cell__label">{t.finance.chairHour}</p>
              <p className="stat-cell__value">{money(wholeUnits(chairHour))}</p>
              <p className="stat-cell__hint">{t.finance.chairHourHint}</p>
            </Card>
          )}
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
        </div>

        {/* Услуги и мастера — один пояс: обе карточки разбирают ту же сумму на
            части, и высоты у них сопоставимые. У соло-мастера мастеров нет, и
            услуги занимают пояс целиком. */}
        <Card className={showMembers ? undefined : 'finance-grid__full'}>
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
                    <i style={{ width: `${Math.round((service.revenue / serviceMax) * 100)}%` }} />
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
          {/* Столбики говорят, что покупают; вердикт — что из этого выгодно
                держать в расписании. Сказать это может только экран, у
                которого есть и деньги услуги, и её минуты. */}
          {verdict ? (
            <p className="finance-verdict">
              <span className="finance-verdict__line">
                {fmt(t.finance.yieldVerdict, {
                  worst: verdict.worst.name,
                  best: verdict.best.name,
                  gap: verdict.gapPercent,
                  worstRate: money(wholeUnits(verdict.worst.perHour)),
                  bestRate: money(wholeUnits(verdict.best.perHour)),
                })}
              </span>{' '}
              <span className="finance-verdict__advice">
                {fmt(t.finance.yieldAdvice, { best: verdict.best.name })}
              </span>
            </p>
          ) : null}
        </Card>

        {showMembers ? membersTable : null}

        <CompletedTable
          rows={completed}
          total={money(summary.totalRevenue)}
          currency={summary.currency}
          memberNames={memberNames}
          className="finance-grid__full"
        />
      </div>

      {/* Сказано прямо: это не бухгалтерия, и платежей у продукта нет. */}
      <p className="finance-disclaimer">{t.finance.disclaimer}</p>
    </>
  );
}
