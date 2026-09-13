import type { Metadata } from 'next';
import type { Booking } from '@/features/bookings/types';
import { BookingPageCard } from '@/features/dashboard-home/components/booking-page-card';
import { DayRailStrip } from '@/features/dashboard-home/components/day-rail';
import { IncomeCard } from '@/features/dashboard-home/components/income-card';
import { TomorrowCard } from '@/features/dashboard-home/components/tomorrow-card';
import { dayRailModel } from '@/features/dashboard-home/day-rail';
import { HomeBoard } from '@/features/dashboard-home/components/home-board';
import { todayModel } from '@/features/dashboard-home/today-model';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import type { TeamMember } from '@/features/team/types';
import { currentUserName } from '@/lib/current-user';
import { formatPrice, formatTime, formatWeekdayDayMonth, isSameDay } from '@/lib/format';
import { fmt, plural, type Messages } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';

const DAY_MS = 24 * 60 * 60_000;
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
  /* Завтрашний день — ради одной фразы в правой колонке: работает ли
     заведение завтра и с какого по какой час. */
  const nextDay = dayWindow(new Date(now.getTime() + DAY_MS), timeZone);
  /* Окна — на неделю вперёд одним запросом: сегодняшние дают открытое время
     дня, будущие отвечают, сможет ли кто-нибудь вообще записаться. */
  const ahead = { from: day.from, to: new Date(now.getTime() + WEEK_MS) };

  const [bookings, tomorrowBookings, pendingBookings, slots, onboarding, roster, blocks] =
    await Promise.all([
      serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(day)}`),
      /* Отказ завтрашнего дня не должен ронять сегодняшний: без него блок
         «Завтра» просто говорит, что записей нет. */
      serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(nextDay)}`).catch(
        () => [] as Booking[],
      ),
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

  /*
   * Строка фактов — одна фраза под приветствием (прототип «Кабинет 2026»),
   * а не сетка крупных чисел. Числа набранные крупно спорили с приветствием
   * и с деньгами дня за то, кто на экране главный; здесь же им место второй
   * строки: «какой сегодня день, сколько записей, с какого по какой час».
   */
  const factParts = [
    formatWeekdayDayMonth(now, locale, timeZone, 'long'),
    `${model.today.length} ${plural(locale, model.today.length, t.common.bookingForms)}`,
    ...(first && lastEnd
      ? [`${formatTime(first.startsAt, locale, timeZone)}–${formatTime(lastEnd, locale, timeZone)}`]
      : []),
    ...(team ? [`${working} ${plural(locale, working, t.workspace.workingForms)}`] : []),
  ];
  const facts = factParts.join(' · ');

  /* Линейка суток: занятое, свободное и заблокированное на одной шкале. */
  const rail = dayRailModel(model.today, model.intervals, now, timeZone, { blocks });

  const memberHours = Object.fromEntries(
    (team ?? []).map((member) => [member.id, hoursOf(slots, member.id, now, timeZone, locale)]),
  );
  const pending = [...pendingBookings].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  /* Завтра одной фразой: сколько записей и с какого по какой час. */
  const tomorrowLive = tomorrowBookings
    .filter((booking) => booking.status !== 'cancelled_by_client')
    .filter((booking) => booking.status !== 'cancelled_by_master')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const tomorrowLast = tomorrowLive[tomorrowLive.length - 1];
  const tomorrowEnd = tomorrowLast
    ? new Date(
        new Date(tomorrowLast.startsAt).getTime() +
          tomorrowLast.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) * 60_000,
      ).toISOString()
    : null;
  const tomorrowLine =
    tomorrowLive[0] && tomorrowEnd
      ? fmt(t.workspace.tomorrowLine, {
          bookings: `${tomorrowLive.length} ${plural(locale, tomorrowLive.length, t.common.bookingForms)}`,
          from: formatTime(tomorrowLive[0].startsAt, locale, timeZone),
          to: formatTime(tomorrowEnd, locale, timeZone),
        })
      : t.workspace.tomorrowFree;

  return (
    <>
      <PageHeader title={t.nav.home} meta={t.nav.hintHome} />

      {onboarding ? <SetupProgressCard slug={slug} status={onboarding} t={t} /> : null}

      <HomeBoard
        slug={slug}
        greeting={greeting(t, accountName, now, timeZone)}
        facts={facts}
        rail={rail ? <DayRailStrip rail={rail} label={t.workspace.dayRail} t={t} /> : null}
        income={
          capabilities.canViewFinance && model.revenue.length ? (
            <IncomeCard
              label={t.workspace.incomeToday}
              value={model.revenue
                .map(([currency, amount]) => formatPrice(amount, currency, locale))
                .join(' · ')}
              hint={`${t.workspace.doneFact} ${fmt(t.workspace.doneOf, { done, total: model.today.length })}`}
            />
          ) : null
        }
        /* Адрес страницы записи с QR — и на главной, и в разделе «Страница»:
           ссылку дают у зеркала и в переписке, и второй дороги к ней быть не
           должно только там, где её настраивают. */
        pageCard={
          capabilities.canManagePage ? (
            <BookingPageCard
              slug={slug}
              published={onboarding?.steps.find((step) => step.key === 'profile')?.done}
            />
          ) : null
        }
        tomorrow={
          <TomorrowCard
            title={t.workspace.tomorrow}
            date={formatWeekdayDayMonth(new Date(now.getTime() + DAY_MS), locale, timeZone, 'long')}
            line={tomorrowLine}
          />
        }
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
