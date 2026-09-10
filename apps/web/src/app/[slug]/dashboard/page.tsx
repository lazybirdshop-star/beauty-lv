import type { Metadata } from 'next';
import Link from 'next/link';
import type { Booking } from '@/features/bookings/types';
import { DayList } from '@/features/dashboard-home/components/day-list';
import type { TimelineEntry } from '@/features/dashboard-home/components/day-timeline';
import { NextVisitCard } from '@/features/dashboard-home/components/next-visit-card';
import { todayModel } from '@/features/dashboard-home/today-model';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { formatDate, formatPrice, formatTime } from '@/lib/format';
import { fmt } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.home };
}

export default async function MasterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);
  const capabilities = workspaceCapabilities(organization.role);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const now = new Date();
  const query = timeWindowQuery(dayWindow(now, timeZone));
  // Today uses the scoped booking endpoint. Organization-wide activity is not a staff feed.
  const [bookings, slots, onboarding] = await Promise.all([
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${query}`),
    serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${query}`),
    capabilities.canManageWorkspace
      ? serverApiFetch<OnboardingStatus>('/onboarding')
      : Promise.resolve(null),
  ]);
  const model = todayModel(bookings, slots, now, timeZone);
  const base = `/${slug}/dashboard`;
  const entries: TimelineEntry[] = model.today.map((booking) => ({
    id: booking.id,
    startsAt: booking.startsAt,
    minutes: booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0),
    clientName: booking.guestName || t.home.guest,
    serviceName: booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
    tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
    status: booking.status,
    href: `${base}/bookings?booking=${booking.id}`,
  }));
  const next = entries.find((entry) => entry.id === model.next?.id);
  return (
    <>
      <PageHeader
        title={t.nav.home}
        meta={`${formatDate(now, locale, timeZone)} · ${organization.name}`}
      />
      <div className="today-summary">
        <span className="t-strong">{fmt(t.home.bookingsCount, { count: model.today.length })}</span>
        {capabilities.canViewFinance && model.revenue.length ? (
          <span>
            {t.workspace.expectedRevenue}:{' '}
            {model.revenue
              .map(([currency, amount]) => formatPrice(amount, currency, locale))
              .join(' · ')}
          </span>
        ) : null}
        <Link href={`${base}/calendar`}>
          {fmt(t.workspace.openCount, { count: model.open.length })}
        </Link>
      </div>
      {onboarding ? <SetupProgressCard slug={slug} status={onboarding} t={t} /> : null}
      <div className="today-workspace">
        <section className="today-schedule" aria-label={t.home.today}>
          <div className="today-section-head">
            <h2 className="t-section">{t.home.today}</h2>
            <Link href={`${base}/calendar`}>{t.nav.calendar}</Link>
          </div>
          {entries.length ? (
            <DayList entries={entries} gaps={[]} timeZone={timeZone} locale={locale} />
          ) : (
            <div className="today-empty">
              <p>{t.home.noBookings}</p>
              <Link className="btn btn-secondary btn-lg" href={`${base}/calendar?open=1`}>
                {t.workspace.openTime}
              </Link>
            </div>
          )}
        </section>
        <aside className="today-aside">
          {next ? (
            <NextVisitCard
              entry={next}
              timeZone={timeZone}
              locale={locale}
              phone={model.next?.guestPhone ?? null}
            />
          ) : (
            <p className="t-meta">{t.workspace.dayFinished}</p>
          )}
          <section className="today-attention">
            <h2 className="t-section">{t.workspace.attention}</h2>
            {model.pending.length ? (
              <>
                <p className="t-meta">{t.workspace.pending}</p>
                {model.pending.map((booking) => (
                  <Link
                    className="today-attention-row"
                    key={booking.id}
                    href={`${base}/bookings?booking=${booking.id}`}
                  >
                    <span>{booking.guestName || t.home.guest}</span>
                    <span className="tnum">{formatTime(booking.startsAt, locale, timeZone)}</span>
                  </Link>
                ))}
              </>
            ) : (
              <>
                <p className="t-strong">{t.workspace.allClear}</p>
                <p className="t-meta">{t.workspace.nothingPending}</p>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
