import { BarChart, type BarChartPoint } from '@/components/ui/bar-chart';
import { Funnel, type AdminFunnel } from '@/features/admin/home/components/funnel';
import { Card, CardLabel } from '@/components/ui/card';
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
  tone?: 'accent';
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
      tone: 'accent',
    },
    { key: 'clientsCount', label: t.adminHome.clients, hint: t.adminHome.clientsHint },
    {
      key: 'organizationsCount',
      label: t.adminHome.organizations,
      hint: t.adminHome.organizationsHint,
    },
  ];
}

function momentumMetrics(t: Messages): MetricSpec[] {
  return [
    { key: 'bookingsCount', label: t.adminHome.bookings, hint: t.adminHome.bookingsHint },
    {
      key: 'newRegistrationsLast7Days',
      label: t.adminHome.newAccounts,
      hint: t.adminHome.newAccountsHint,
    },
    {
      key: 'activeSubscriptionsCount',
      label: t.adminHome.subscriptions,
      hint: t.adminHome.subscriptionsHint,
    },
  ];
}

function MetricGroup({
  title,
  metrics,
  summary,
}: {
  title: string;
  metrics: MetricSpec[];
  summary: AdminDashboardSummary;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-[22px] leading-none text-ink">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        {metrics.map((metric, index) => (
          <StatTile
            key={metric.key}
            label={metric.label}
            value={summary[metric.key]}
            hint={metric.hint}
            emphasis={metric.tone ? 'lead' : undefined}
            className={index === metrics.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}
          />
        ))}
      </div>
    </section>
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
      <MetricGroup title={t.adminHome.scale} metrics={scaleMetrics(t)} summary={summary} />
      <MetricGroup title={t.adminHome.momentum} metrics={momentumMetrics(t)} summary={summary} />

      {/* Воронка идёт до графиков: объёмы говорят, сколько людей пришло, а
          она — сколько из них дошло до работы. Это разные вопросы, и второй
          на этапе, когда платформа открывается по одной мастерской, важнее. */}
      <section>
        <h2 className="mb-3 font-display text-[22px] leading-none text-ink">{t.funnel.title}</h2>
        <Funnel funnel={funnel} t={t} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-[22px] leading-none text-ink">
          {t.adminHome.last12Weeks}
        </h2>
        {/* Two charts, not one with two y-axes: registrations and bookings are
            different magnitudes, and sharing an axis would invent a
            correlation between them. */}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
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
      </section>
    </div>
  );
}
