import { GlassCard, GlassCardTitle } from '@/components/ui/glass-card';
import { StatTile } from '@/components/ui/stat-tile';
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <StatTile
          label="Ближайшие"
          value={summary.upcomingBookingsCount}
          hint="записей впереди"
          tone="accent"
        />
        <StatTile label="Клиенты" value={summary.clientsCount} hint="в базе" />
        <StatTile
          label="Доход"
          value={formatRevenue(summary.revenue)}
          hint="завершённые записи"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <GlassCard>
        <GlassCardTitle className="mb-4">Последние действия</GlassCardTitle>
        {summary.recentActivity.length === 0 ? (
          <p className="text-sm text-ink-soft">Пока нет активности.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {summary.recentActivity.map((activity) => (
              <li key={activity.at} className="flex items-center gap-3 text-sm text-ink-soft">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {activity.message}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
