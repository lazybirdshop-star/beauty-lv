import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/server-api';

interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
}

const METRICS: { key: keyof AdminDashboardSummary; label: string }[] = [
  { key: 'mastersCount', label: 'Мастера' },
  { key: 'clientsCount', label: 'Клиенты' },
  { key: 'organizationsCount', label: 'Организации' },
  { key: 'newRegistrationsLast7Days', label: 'Новые регистрации за 7 дней' },
  { key: 'bookingsCount', label: 'Записи' },
  { key: 'activeSubscriptionsCount', label: 'Активные подписки' },
];

export default async function AdminDashboardPage() {
  const summary = await serverApiFetch<AdminDashboardSummary>('/admin/summary');

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
      {METRICS.map((metric) => (
        <Card key={metric.key}>
          <CardHeader>
            <CardTitle>{metric.label}</CardTitle>
          </CardHeader>
          <p className="text-3xl font-semibold tabular-nums text-ink">{summary[metric.key]}</p>
        </Card>
      ))}
    </div>
  );
}
