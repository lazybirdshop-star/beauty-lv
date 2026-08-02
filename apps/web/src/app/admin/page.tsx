import { StatTile } from '@/components/ui/stat-tile';
import { serverApiFetch } from '@/lib/server-api';

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
const SCALE_METRICS: MetricSpec[] = [
  { key: 'mastersCount', label: 'Мастера', hint: 'аккаунтов', tone: 'accent' },
  { key: 'clientsCount', label: 'Клиенты', hint: 'во всех базах' },
  { key: 'organizationsCount', label: 'Организации', hint: 'страниц записи' },
];

const MOMENTUM_METRICS: MetricSpec[] = [
  { key: 'bookingsCount', label: 'Записи', hint: 'всего создано' },
  { key: 'newRegistrationsLast7Days', label: 'Новые', hint: 'регистраций за 7 дней' },
  { key: 'activeSubscriptionsCount', label: 'Подписки', hint: 'активных' },
];

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
            tone={metric.tone}
            className={index === metrics.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const summary = await serverApiFetch<AdminDashboardSummary>('/admin/summary');

  return (
    <div className="flex flex-col gap-8">
      <MetricGroup title="Масштаб платформы" metrics={SCALE_METRICS} summary={summary} />
      <MetricGroup title="Динамика" metrics={MOMENTUM_METRICS} summary={summary} />
    </div>
  );
}
