import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { TodayBookingsCard } from '@/features/dashboard-home/components/today-bookings-card';
import { getTodaysBookings } from '@/features/dashboard-home/today-bookings';
import type { Booking } from '@/features/bookings/types';
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

interface MasterDashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MasterDashboardPage({ params }: MasterDashboardPageProps) {
  const { slug } = await params;
  const [summary, bookings] = await Promise.all([
    serverApiFetch<DashboardSummary>('/organizations/me/summary'),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings`),
  ]);
  const todaysBookings = getTodaysBookings(bookings);

  return (
    <div className="flex flex-col gap-4">
      <TodayBookingsCard bookings={todaysBookings} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
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
