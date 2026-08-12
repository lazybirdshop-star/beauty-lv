import Link from 'next/link';

import { Card, CardLabel } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { OnboardingChecklist } from '@/features/dashboard-home/components/onboarding-checklist';
import { ShareCard } from '@/features/dashboard-home/components/share-card';
import { TodayBookingsCard } from '@/features/dashboard-home/components/today-bookings-card';
import { getTodaysBookings } from '@/features/dashboard-home/today-bookings';
import type { Booking, BookingStatus } from '@/features/bookings/types';
import { Badge } from '@/components/ui/badge';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { filterForStatus } from '@/features/bookings/filter';
import { fmt } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Client } from '@/features/clients/types';

interface DashboardSummary {
  todaysBookingsCount: number;
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: { guestName: string | null; status: BookingStatus; at: string }[];
}

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatRevenue(revenue: DashboardSummary['revenue'], locale: string): string {
  let formatter = CURRENCY_FORMATTERS.get(revenue.currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: revenue.currency });
    CURRENCY_FORMATTERS.set(revenue.currency, formatter);
  }
  return formatter.format(revenue.amountMinorUnits / 100);
}

interface MasterDashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MasterDashboardPage({ params }: MasterDashboardPageProps) {
  const { slug } = await params;
  const [summary, bookings, services, slots, clients] = await Promise.all([
    serverApiFetch<DashboardSummary>('/organizations/me/summary'),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings`),
    serverApiFetch<unknown[]>(`/organizations/${slug}/services`),
    serverApiFetch<unknown[]>(`/organizations/${slug}/slots`),
    // Only so a returning client can be recognised on today's list.
    serverApiFetch<Client[]>(`/organizations/${slug}/clients`),
  ]);
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const todaysBookings = getTodaysBookings(bookings);

  return (
    <div className="flex flex-col gap-4">
      <OnboardingChecklist
        slug={slug}
        hasService={services.length > 0}
        hasSlot={slots.length > 0}
        hasBooking={bookings.length > 0}
        t={t}
      />

      {/* Order follows what the master opened the panel for: what is happening
          today, then how the business is doing, and only then the utility she
          needs once — the link to her page. Sharing sat between the schedule
          and the numbers on every single visit, forever. */}
      <TodayBookingsCard bookings={todaysBookings} clients={clients} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <StatTile
          label={t.home.upcoming}
          value={summary.upcomingBookingsCount}
          hint={t.home.upcomingHint}
          tone="accent"
        />
        <StatTile label={t.home.clients} value={summary.clientsCount} hint={t.home.clientsHint} />
        <StatTile
          label={t.home.income}
          value={formatRevenue(summary.revenue, locale)}
          hint={t.home.incomeHint}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <ShareCard slug={slug} />

      <Card>
        <CardLabel className="mb-4">{t.home.recentActivity}</CardLabel>
        {summary.recentActivity.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.home.noActivity}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {summary.recentActivity.map((activity, index) => {
              const meta = getBookingStatusMeta(t)[activity.status];
              return (
                /* The status wears the same badge it wears everywhere else in
                   the panel, instead of arriving as the bare word `pending`.
                   The key carries the index too: two actions in the same
                   millisecond are rare but real, and a duplicate key drops a
                   row. */
                <li key={`${activity.at}-${index}`}>
                  {/* The feed reports something that happened and then refused
                      to take her there — a dead end on the busiest card of the
                      panel. Each row now opens the bookings list already in
                      the posture this entry belongs to. */}
                  <Link
                    href={`/${slug}/dashboard/bookings?status=${filterForStatus(activity.status)}`}
                    aria-label={fmt(t.home.recentActivityOpen, {
                      name: activity.guestName || t.home.guest,
                    })}
                    className="press -mx-2 flex min-h-11 items-center justify-between gap-3 rounded-2xl px-2 text-sm hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  >
                    <span className="min-w-0 truncate text-ink">
                      {activity.guestName || t.home.guest}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {/* When it happened — «Анна · Новая» without a time asks
                          the master to remember whether she has seen this line
                          before (heuristic 6). */}
                      <time dateTime={activity.at} className="text-xs tabular-nums text-ink-faint">
                        {new Date(activity.at).toLocaleString(locale, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
