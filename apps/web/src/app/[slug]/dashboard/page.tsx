import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/server-api';

interface DashboardSummary {
  todaysBookingsCount: number;
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: { message: string; at: string }[];
}

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatRevenue(revenue: DashboardSummary['revenue']): string {
  let formatter = CURRENCY_FORMATTERS.get(revenue.currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: revenue.currency });
    CURRENCY_FORMATTERS.set(revenue.currency, formatter);
  }
  return formatter.format(revenue.amountMinorUnits / 100);
}

export default async function MasterDashboardPage() {
  const summary = await serverApiFetch<DashboardSummary>('/organizations/me/summary');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Записи сегодня</CardTitle>
          </CardHeader>
          <p className="text-3xl font-semibold tabular-nums text-ink">
            {summary.todaysBookingsCount}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ближайшие записи</CardTitle>
          </CardHeader>
          <p className="text-3xl font-semibold tabular-nums text-ink">
            {summary.upcomingBookingsCount}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Клиенты</CardTitle>
          </CardHeader>
          <p className="text-3xl font-semibold tabular-nums text-ink">{summary.clientsCount}</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Доход</CardTitle>
          </CardHeader>
          <p className="text-3xl font-semibold tabular-nums text-ink">
            {formatRevenue(summary.revenue)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние действия</CardTitle>
        </CardHeader>
        {summary.recentActivity.length === 0 ? (
          <p className="text-sm text-ink-soft">Пока нет активности.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.recentActivity.map((activity) => (
              <li key={activity.at} className="text-sm text-ink-soft">
                {activity.message}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
