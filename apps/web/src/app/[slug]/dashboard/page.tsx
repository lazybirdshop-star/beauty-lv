import Link from 'next/link';

import { Card, CardLabel } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { Rise, RISE_GROUP, RISE_ITEM, riseDelay } from '@/components/ui/rise';
import { StatTile } from '@/components/ui/stat-tile';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import { ShareCard } from '@/features/dashboard-home/components/share-card';
import { TodayBookingsCard } from '@/features/dashboard-home/components/today-bookings-card';
import { getTodaysBookings } from '@/features/dashboard-home/today-bookings';
import type { Booking, BookingStatus } from '@/features/bookings/types';
import { Badge } from '@/components/ui/badge';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { filterForStatus } from '@/features/bookings/filter';
import type { PublishedSlot } from '@/features/scheduling/types';
import { formatDateTime } from '@/lib/format';
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

/**
 * Окна на сутки вокруг «сейчас». Какой из них сегодняшний, решает уже клиент,
 * в часовом поясе мастера: сервер живёт в UTC, и его «сегодня» на границе
 * суток — не то «сегодня», которое мастер видит в телефоне.
 */
const RAIL_WINDOW_MS = 36 * 60 * 60 * 1000;

function nearbyFreeSlots(slots: PublishedSlot[]): string[] {
  const now = Date.now();
  return slots
    .filter((slot) => slot.status === 'available')
    .filter((slot) => Math.abs(new Date(slot.startsAt).getTime() - now) < RAIL_WINDOW_MS)
    .map((slot) => slot.startsAt);
}

interface MasterDashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MasterDashboardPage({ params }: MasterDashboardPageProps) {
  const { slug } = await params;
  const [summary, bookings, onboarding, clients, slots] = await Promise.all([
    serverApiFetch<DashboardSummary>('/organizations/me/summary'),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings`),
    /* Setup progress arrives already decided by the API — the home screen
       used to infer it from three list endpoints it fetched for no other
       purpose, and could not see the two steps that are about the page
       itself (its address and its design). */
    serverApiFetch<OnboardingStatus>('/onboarding'),
    // Only so a returning client can be recognised on today's list.
    serverApiFetch<Client[]>(`/organizations/${slug}/clients`),
    // Вторая половина суток мастера: окна, которые она открыла и которые ещё
    // никем не заняты. Без них шкала показывала бы только работу и молчала о
    // том, куда клиент ещё может встать.
    serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots`),
  ]);
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const todaysBookings = getTodaysBookings(bookings);

  /*
   * Порядок идёт за тем, ради чего мастер открыла кабинет: что происходит
   * сегодня, потом как идут дела, и только потом утилита, нужная ей один раз, —
   * ссылка на её страницу.
   *
   * Лесенка появления — 100ms между смысловыми группами, как требует система.
   */
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <SetupProgressCard slug={slug} status={onboarding} t={t} />

      <Rise>
        <TodayBookingsCard
          slug={slug}
          bookings={todaysBookings}
          clients={clients}
          freeSlots={nearbyFreeSlots(slots)}
        />
      </Rise>

      <Rise delay={RISE_GROUP} className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {/* Плитки стоят вплотную, разделённые волосяной линией, а не
            разъехавшимися карточками: в системе каждый блок в собственной
            рамке — дефект. */}
        <StatTile
          label={t.home.upcoming}
          value={<CountUp to={summary.upcomingBookingsCount} locale={locale} delay={RISE_GROUP} />}
          hint={t.home.upcomingHint}
          emphasis="lead"
          className="col-span-2 sm:col-span-1"
        />
        <StatTile
          label={t.home.clients}
          value={
            <CountUp to={summary.clientsCount} locale={locale} delay={RISE_GROUP + RISE_ITEM} />
          }
          hint={t.home.clientsHint}
        />
        <StatTile
          label={t.home.income}
          value={
            <CountUp
              to={summary.revenue.amountMinorUnits / 100}
              currency={summary.revenue.currency}
              locale={locale}
              delay={RISE_GROUP + RISE_ITEM * 2}
            />
          }
          hint={t.home.incomeHint}
        />
      </Rise>

      <Rise delay={RISE_GROUP * 2}>
        <ShareCard slug={slug} />
      </Rise>

      <Rise delay={RISE_GROUP * 3}>
        <Card>
          <CardLabel className="mb-5">{t.home.recentActivity}</CardLabel>
          {summary.recentActivity.length === 0 ? (
            <p className="text-sm text-ink-faint">{t.home.noActivity}</p>
          ) : (
            <ul className="flex flex-col">
              {summary.recentActivity.map((activity, index) => {
                const meta = getBookingStatusMeta(t)[activity.status];
                return (
                  /* The status wears the same badge it wears everywhere else in
                     the panel, instead of arriving as the bare word `pending`.
                     The key carries the index too: two actions in the same
                     millisecond are rare but real, and a duplicate key drops a
                     row. */
                  <li
                    key={`${activity.at}-${index}`}
                    className="rise"
                    style={riseDelay(index * 50)}
                  >
                    {/* The feed reports something that happened and then refused
                        to take her there — a dead end on the busiest card of the
                        panel. Each row now opens the bookings list already in
                        the posture this entry belongs to. */}
                    <Link
                      href={`/${slug}/dashboard/bookings?status=${filterForStatus(activity.status)}`}
                      aria-label={fmt(t.home.recentActivityOpen, {
                        name: activity.guestName || t.home.guest,
                      })}
                      className="action-motion -mx-5 flex min-h-11 items-center justify-between gap-3 border-b border-border px-5 text-sm last:border-b-0 hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      <span className="min-w-0 truncate text-ink">
                        {activity.guestName || t.home.guest}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {/* When it happened — «Анна · Новая» without a time asks
                            the master to remember whether she has seen this line
                            before (heuristic 6). */}
                        <time
                          dateTime={activity.at}
                          className="text-xs tabular-nums text-ink-faint"
                        >
                          {formatDateTime(activity.at, locale)}
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
      </Rise>
    </div>
  );
}
