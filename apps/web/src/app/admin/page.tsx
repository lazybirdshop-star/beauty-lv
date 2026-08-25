import { BarChart, type BarChartPoint } from '@/components/ui/bar-chart';
import { Funnel, type AdminFunnel } from '@/features/admin/home/components/funnel';
import { Card, CardLabel } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { Rise, RISE_GROUP, RISE_ITEM } from '@/components/ui/rise';
import { StatTile } from '@/components/ui/stat-tile';
import { fmt } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import type { Messages } from '@/lib/i18n/messages';
import { serverApiFetch } from '@/lib/server-api';

interface WeeklyPoint {
  week: string;
  value: number;
}

interface AdminWeeklyTrends {
  registrations: WeeklyPoint[];
  bookings: WeeklyPoint[];
}

function weekPoints(points: WeeklyPoint[], locale: string, t: Messages): BarChartPoint[] {
  const weekFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return points.map((point) => {
    const date = new Date(`${point.week}T00:00:00`);
    return {
      label: String(date.getDate()),
      title: fmt(t.adminHome.weekOf, { date: weekFormatter.format(date) }),
      value: point.value,
    };
  });
}

interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
}

interface MetricSpec {
  key: keyof AdminDashboardSummary;
  label: string;
  hint: string;
  /** Раздел, в котором это число раскрывается списком. */
  href: string;
  tone?: 'accent';
  /** Ряд недель за тем же числом — там, где платформа его ведёт. */
  trend?: number[];
  trendLabel?: string;
}

/**
 * Grouped rather than one flat six-tile grid: the first group is the size
 * of the platform, the second is how it is moving. A flat grid gives every
 * number the same weight and reads as a data dump.
 */
function scaleMetrics(t: Messages): MetricSpec[] {
  return [
    {
      key: 'mastersCount',
      label: t.adminHome.masters,
      hint: t.adminHome.mastersHint,
      href: '/admin/masters',
      tone: 'accent',
    },
    {
      key: 'clientsCount',
      label: t.adminHome.clients,
      hint: t.adminHome.clientsHint,
      href: '/admin/users',
    },
    {
      key: 'organizationsCount',
      label: t.adminHome.organizations,
      hint: t.adminHome.organizationsHint,
      href: '/admin/organizations',
    },
  ];
}

/**
 * У «Динамики» под числом идёт ряд недель — там, где платформа его ведёт.
 * Ряд отвечает на второй вопрос сводки: «записей 412» говорит, сколько их
 * всего, и молчит о том, растёт ли это. Подписки платформа по неделям не
 * считает, и рисовать им ряд было бы выдумкой.
 */
function momentumMetrics(t: Messages, trends: AdminWeeklyTrends): MetricSpec[] {
  return [
    {
      key: 'bookingsCount',
      label: t.adminHome.bookings,
      hint: t.adminHome.bookingsHint,
      href: '/admin/bookings',
      trend: trends.bookings.map((point) => point.value),
      trendLabel: t.adminHome.bookingsCaption,
    },
    {
      key: 'newRegistrationsLast7Days',
      label: t.adminHome.newAccounts,
      hint: t.adminHome.newAccountsHint,
      href: '/admin/users',
      trend: trends.registrations.map((point) => point.value),
      trendLabel: t.adminHome.registrationsCaption,
    },
    {
      key: 'activeSubscriptionsCount',
      label: t.adminHome.subscriptions,
      hint: t.adminHome.subscriptionsHint,
      href: '/admin/subscriptions',
    },
  ];
}

function MetricGroup({
  title,
  metrics,
  summary,
  locale,
  delay,
}: {
  title: string;
  metrics: MetricSpec[];
  summary: AdminDashboardSummary;
  locale: string;
  delay: number;
}) {
  return (
    <Rise delay={delay}>
      <h2 className="mb-3 font-display text-[22px] leading-none text-ink">{title}</h2>
      {/* Плитки стоят вплотную, разделённые волосяной линией: в системе
          каждый блок в собственной рамке — дефект. Тот же ряд, что на главной
          кабинета мастера, — панель платформы и кабинет говорят одним языком. */}
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {metrics.map((metric, index) => (
          <StatTile
            key={metric.key}
            label={metric.label}
            /* Число доводится пружиной от нуля — та же лесенка, что у
               появления самой группы. Без доводки шесть чисел встают разом и
               читаются как выгрузка, а не как сводка. */
            value={
              <CountUp to={summary[metric.key]} locale={locale} delay={delay + index * RISE_ITEM} />
            }
            hint={metric.hint}
            href={metric.href}
            trend={metric.trend}
            trendLabel={metric.trendLabel}
            delay={delay + index * RISE_ITEM}
            emphasis={metric.tone ? 'lead' : undefined}
            className={index === metrics.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}
          />
        ))}
      </div>
    </Rise>
  );
}

export default async function AdminDashboardPage() {
  const [summary, trends, funnel, locale] = await Promise.all([
    serverApiFetch<AdminDashboardSummary>('/admin/summary'),
    serverApiFetch<AdminWeeklyTrends>('/admin/trends'),
    serverApiFetch<AdminFunnel>('/admin/funnel'),
    getRequestLocale(),
  ]);
  const t = getMessages(locale);

  return (
    <div className="flex flex-col gap-8">
      <MetricGroup
        title={t.adminHome.scale}
        metrics={scaleMetrics(t)}
        summary={summary}
        locale={locale}
        delay={0}
      />
      <MetricGroup
        title={t.adminHome.momentum}
        metrics={momentumMetrics(t, trends)}
        summary={summary}
        locale={locale}
        delay={RISE_GROUP}
      />

      {/* Воронка идёт до графиков: объёмы говорят, сколько людей пришло, а
          она — сколько из них дошло до работы. Это разные вопросы, и второй
          на этапе, когда платформа открывается по одной мастерской, важнее. */}
      <Rise delay={RISE_GROUP * 2}>
        <h2 className="mb-3 font-display text-[22px] leading-none text-ink">{t.funnel.title}</h2>
        <Funnel funnel={funnel} t={t} />
      </Rise>

      <Rise delay={RISE_GROUP * 3}>
        <h2 className="mb-3 font-display text-[22px] leading-none text-ink">
          {t.adminHome.last12Weeks}
        </h2>
        {/* Two charts, not one with two y-axes: registrations and bookings are
            different magnitudes, and sharing an axis would invent a
            correlation between them. */}
        <div className="grid gap-px bg-border lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardLabel>{t.adminHome.registrations}</CardLabel>
            <BarChart
              data={weekPoints(trends.registrations, locale, t)}
              formatValue={(value) => `${value}`}
              caption={t.adminHome.registrationsCaption}
              emptyLabel={t.common.chartEmpty}
            />
          </Card>
          <Card className="flex flex-col gap-4">
            <CardLabel>{t.adminHome.bookings}</CardLabel>
            <BarChart
              data={weekPoints(trends.bookings, locale, t)}
              formatValue={(value) => `${value}`}
              caption={t.adminHome.bookingsCaption}
              emptyLabel={t.common.chartEmpty}
            />
          </Card>
        </div>
      </Rise>
    </div>
  );
}
