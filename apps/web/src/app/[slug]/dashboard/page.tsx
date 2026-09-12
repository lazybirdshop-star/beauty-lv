import type { Metadata } from 'next';
import type { Booking } from '@/features/bookings/types';
import { FactsLine, type Fact } from '@/features/dashboard-home/components/facts-line';
import { HomeBoard } from '@/features/dashboard-home/components/home-board';
import { todayModel } from '@/features/dashboard-home/today-model';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import type { TeamMember } from '@/features/team/types';
import { currentUserName } from '@/lib/current-user';
import { formatDayMonth, formatPrice, formatTime, isSameDay } from '@/lib/format';
import { fmt, plural, type Messages } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';

const WEEK_MS = 7 * 24 * 60 * 60_000;
const SLOT_MS = 30 * 60_000;

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

/** «09:00–18:00» — по опубликованным окнам человека сегодня. */
function hoursOf(
  slots: PublishedSlot[],
  memberId: string,
  now: Date,
  timeZone: string,
  locale: string,
) {
  const own = slots
    .filter(
      (slot) => slot.organizationMemberId === memberId && isSameDay(slot.startsAt, now, timeZone),
    )
    .map((slot) => new Date(slot.startsAt).getTime())
    .sort((a, b) => a - b);
  if (!own.length) return '';
  const from = new Date(own[0]!).toISOString();
  const to = new Date(own[own.length - 1]! + SLOT_MS).toISOString();
  return `${formatTime(from, locale, timeZone)}–${formatTime(to, locale, timeZone)}`;
}

/**
 * «Сегодня» — рабочий пульт, а не аналитика (PRODUCT-UX-DIRECTION Part 2).
 *
 * Семь модулей в утверждённом порядке: шапка с фактами, карточка настройки,
 * сейчас/дальше, очередь «нужен ответ», день, время, команда сегодня.
 * Соло-мастер видит свой день; салон — тот же экран, где день разложен на
 * «в кресле» и «дальше», а очередь называет мастера. Никаких плиток и
 * графиков: одно число про деньги, в шапке, только финансовой области.
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
  const capabilities = capabilitiesOf(organization);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const now = new Date();
  const day = dayWindow(now, timeZone);
  /* Окна — на неделю вперёд одним запросом: сегодняшние дают открытое время
     дня, будущие отвечают, сможет ли кто-нибудь вообще записаться. */
  const ahead = { from: day.from, to: new Date(now.getTime() + WEEK_MS) };

  const [bookings, pendingBookings, slots, onboarding, roster, blocks] = await Promise.all([
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(day)}`),
    /* Непринятые — все, а не только за сегодня: запись на субботу ждёт ответа
       сейчас. Область та же, что у списка записей: мастеру салона — свои. */
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings?status=pending`),
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

  const working = team
    ? team.filter(
        (member) =>
          member.status === 'active' &&
          (member.bookingsToday > 0 ||
            model.intervals.some((interval) => interval.memberId === member.id)),
      ).length
    : 0;
  const done = model.today.filter((booking) => booking.status === 'completed').length;
  const first = model.today[0];
  const last = model.today[model.today.length - 1];
  const lastEnd = last
    ? new Date(
        new Date(last.startsAt).getTime() +
          last.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) * 60_000,
      ).toISOString()
    : null;

  const facts: Fact[] = [
    {
      key: 'date',
      value: formatDayMonth(now, locale, timeZone),
      label: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone }).format(now),
    },
    {
      key: 'bookings',
      value: model.today.length,
      label: plural(locale, model.today.length, t.common.bookingForms),
    },
    ...(team
      ? [
          {
            key: 'working',
            value: working,
            label: plural(locale, working, t.workspace.workingForms),
          },
        ]
      : []),
    ...(first && lastEnd
      ? [
          {
            key: 'hours',
            value: `${formatTime(first.startsAt, locale, timeZone)}–${formatTime(lastEnd, locale, timeZone)}`,
            label: team ? t.workspace.salonDay : t.workspace.workingDay,
          },
        ]
      : []),
    ...(capabilities.canViewFinance && model.revenue.length
      ? [
          {
            key: 'income',
            value: model.revenue
              .map(([currency, amount]) => formatPrice(amount, currency, locale))
              .join(' · '),
            label: t.workspace.incomeFact,
          },
        ]
      : []),
    {
      key: 'free',
      value: model.intervals.length,
      label: plural(locale, model.intervals.length, t.workspace.freeForms),
      href: `${base}/calendar`,
    },
    ...(team
      ? [
          {
            key: 'done',
            value: fmt(t.workspace.doneOf, { done, total: model.today.length }),
            label: t.workspace.doneFact,
          },
        ]
      : []),
  ];

  const memberHours = Object.fromEntries(
    (team ?? []).map((member) => [member.id, hoursOf(slots, member.id, now, timeZone, locale)]),
  );
  const pending = [...pendingBookings].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <>
      <PageHeader title={t.nav.home} meta={t.nav.hintHome} />
      <header className="home-head">
        <h2 className="type-greeting">{greeting(t, accountName, now, timeZone)}</h2>
        <FactsLine facts={facts} />
      </header>

      {onboarding ? <SetupProgressCard slug={slug} status={onboarding} t={t} /> : null}

      <HomeBoard
        slug={slug}
        today={model.today}
        pending={pending}
        cancelled={model.cancelled}
        next={model.next ?? null}
        intervals={model.intervals}
        gap={model.gap}
        openAhead={model.openAhead}
        team={team}
        memberHours={memberHours}
        canManageTeam={capabilities.canManageTeam}
        ownDay={!team}
        setupPending={Boolean(onboarding?.nextStep)}
      />
    </>
  );
}
