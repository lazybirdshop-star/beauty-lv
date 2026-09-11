import type { Metadata } from 'next';
import Link from 'next/link';
import type { Booking } from '@/features/bookings/types';
import { DayList } from '@/features/dashboard-home/components/day-list';
import { NextVisitCard } from '@/features/dashboard-home/components/next-visit-card';
import { TeamInvitePrompt } from '@/features/dashboard-home/components/team-invite-prompt';
import { TeamPulse } from '@/features/dashboard-home/components/team-pulse';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import type { TimelineEntry, TimelineGap } from '@/features/dashboard-home/timeline';
import { todayModel } from '@/features/dashboard-home/today-model';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import type { TeamMember } from '@/features/team/types';
import { currentUserName } from '@/lib/current-user';
import { formatDate, formatPrice, formatTime } from '@/lib/format';
import { fmt, plural, type Messages } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';

const WEEK_MS = 7 * 24 * 60 * 60_000;

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.home };
}

/** «Доброе утро, Анна» — по часам салона, а не сервера. */
function greeting(t: Messages, name: string, now: Date, timeZone: string): string {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return t.nav.home;
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(now),
  );
  const template =
    hour < 12 ? t.home.greetingMorning : hour < 18 ? t.home.greetingDay : t.home.greetingEvening;
  return fmt(template, { name: first });
}

/**
 * «Сегодня» — рабочий пульт, а не аналитика (спецификация §8–§9).
 *
 * Один вопрос: что происходит сегодня и что требует внимания. Соло-мастер
 * видит свой день, следующего клиента и неоткрытое время, которое стоит
 * продать; салон — тот же экран, где к дню добавлено, кто из команды чем занят.
 * Никаких декоративных плиток: каждая строка здесь либо отвечает, либо ведёт к
 * действию.
 */
export default async function MasterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [organization, accountName] = await Promise.all([
    requireOrganization(slug),
    currentUserName(),
  ]);
  const capabilities = workspaceCapabilities(organization.role, organization.teamSize);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const now = new Date();
  const day = dayWindow(now, timeZone);
  /* Окна — на неделю вперёд одним запросом: сегодняшние дают открытое время
     дня, будущие отвечают, сможет ли кто-нибудь вообще записаться. */
  const ahead = { from: day.from, to: new Date(now.getTime() + WEEK_MS) };

  const [bookings, slots, onboarding, roster, blocks] = await Promise.all([
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(day)}`),
    serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${timeWindowQuery(ahead)}`),
    capabilities.canManageWorkspace
      ? serverApiFetch<OnboardingStatus>('/onboarding')
      : Promise.resolve(null),
    capabilities.canViewTeamCalendar
      ? serverApiFetch<TeamMember[]>(`/organizations/${slug}/team${timeWindowQuery(day)}`)
      : Promise.resolve(null),
    /* Блоки лишь уточняют подсказку «откройте время»: их отказ не должен
       ронять весь день, и без них подсказка просто остаётся прежней. */
    capabilities.canManageCalendar
      ? serverApiFetch<TimeBlock[]>(
          `/organizations/${slug}/time-blocks${timeWindowQuery(day)}`,
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  const model = todayModel(bookings, slots, now, timeZone, {
    memberId: organization.memberId,
    blocks,
  });
  const base = `/${slug}/dashboard`;
  const team = capabilities.hasTeam && roster ? roster : null;
  const nameOf = new Map((roster ?? []).map((member) => [member.id, member.name]));

  const entries: TimelineEntry[] = model.today.map((booking) => {
    const service = booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
    /* В салоне в дне несколько человек: без имени мастера строка не отвечает,
       к кому идёт клиент. */
    const member = team ? nameOf.get(booking.organizationMemberId) : undefined;
    return {
      id: booking.id,
      startsAt: booking.startsAt,
      minutes: booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0),
      clientName: booking.guestName || t.home.guest,
      serviceName: member ? `${service} · ${member}` : service,
      tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
      status: booking.status,
      href: `${base}/bookings?booking=${booking.id}`,
    };
  });
  /* Открытое время — строками дня только у того, чей это день: в салонном
     списке «свободно до 13:00» без имени не говорит, у кого. */
  const gaps: TimelineGap[] = team
    ? []
    : model.intervals.map((interval) => ({
        startsAt: interval.startsAt,
        minutes: interval.minutes,
      }));
  const next = entries.find((entry) => entry.id === model.next?.id);

  const working = team
    ? team.filter(
        (member) =>
          member.status === 'active' &&
          (member.bookingsToday > 0 ||
            model.intervals.some((interval) => interval.memberId === member.id)),
      ).length
    : 0;

  const attention = model.pending.length > 0 || model.cancelled.length > 0 || !model.openAhead;

  return (
    <>
      <PageHeader
        title={greeting(t, accountName, now, timeZone)}
        meta={`${formatDate(now, locale, timeZone)} · ${organization.name}`}
      />
      <div className="today-summary">
        <span className="t-strong">
          {model.today.length} {plural(locale, model.today.length, t.common.bookingForms)}
        </span>
        {team ? (
          <span>
            {working} {plural(locale, working, t.workspace.workingForms)}
          </span>
        ) : null}
        {capabilities.canViewFinance && model.revenue.length ? (
          <span>
            {t.workspace.expectedRevenue}:{' '}
            {model.revenue
              .map(([currency, amount]) => formatPrice(amount, currency, locale))
              .join(' · ')}
          </span>
        ) : null}
        <Link href={`${base}/calendar`}>
          {model.intervals.length} {plural(locale, model.intervals.length, t.workspace.freeForms)}
        </Link>
      </div>
      {onboarding ? <SetupProgressCard slug={slug} status={onboarding} t={t} /> : null}
      <div className="today-workspace">
        <section className="today-schedule" aria-label={t.home.today}>
          <div className="today-section-head">
            <h2 className="t-section">{t.home.today}</h2>
            <Link href={`${base}/calendar${team ? '?view=team' : ''}`}>{t.nav.calendar}</Link>
          </div>
          {entries.length || gaps.length ? (
            <DayList entries={entries} gaps={gaps} timeZone={timeZone} locale={locale} />
          ) : (
            <div className="today-empty">
              <p>{t.home.freeDay}</p>
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

          {model.gap ? (
            <div className="today-gap">
              <span className="t-strong tnum">
                {fmt(t.workspace.freeGap, {
                  from: formatTime(model.gap.from, locale, timeZone),
                  to: formatTime(model.gap.to, locale, timeZone),
                })}
              </span>
              <Link className="btn btn-secondary btn-sm" href={`${base}/calendar?view=day&open=1`}>
                {t.workspace.openGapAction}
              </Link>
            </div>
          ) : null}

          <section className="today-attention" aria-labelledby="today-attention-title">
            <h2 id="today-attention-title" className="t-section">
              {t.workspace.attention}
            </h2>
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
            ) : null}
            {model.cancelled.length ? (
              <>
                <p className="t-meta">{t.workspace.clientCancelled}</p>
                {model.cancelled.map((booking) => (
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
            ) : null}
            {!model.openAhead ? (
              <div className="today-attention-note">
                <p>{t.workspace.noTimeAhead}</p>
                <Link className="btn btn-secondary btn-sm" href={`${base}/calendar?open=1`}>
                  {t.workspace.openTime}
                </Link>
              </div>
            ) : null}
            {attention ? null : (
              <>
                <p className="t-strong">{t.workspace.allClear}</p>
                <p className="t-meta">{t.workspace.nothingPending}</p>
              </>
            )}
          </section>

          {team ? (
            <TeamPulse members={team} href={`${base}/calendar?view=team`} locale={locale} t={t} />
          ) : null}

          {capabilities.canManageTeam && !capabilities.hasTeam && !onboarding?.nextStep ? (
            <TeamInvitePrompt slug={slug} />
          ) : null}
        </aside>
      </div>
    </>
  );
}
