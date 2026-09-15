import type { Metadata } from 'next';
import type { Booking } from '@/features/bookings/types';
import { BookingPageCard } from '@/features/dashboard-home/components/booking-page-card';
import { DayRailStrip } from '@/features/dashboard-home/components/day-rail';
import { IncomeCard } from '@/features/dashboard-home/components/income-card';
import { NewBookingAction } from '@/features/dashboard-home/components/new-booking-action';
import { TomorrowCard } from '@/features/dashboard-home/components/tomorrow-card';
import { dayRailModel } from '@/features/dashboard-home/day-rail';
import { HomeBoard } from '@/features/dashboard-home/components/home-board';
import { todayModel } from '@/features/dashboard-home/today-model';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { FinanceSummary } from '@/features/finance/types';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import type { Service } from '@/features/services/types';
import type { TeamMember } from '@/features/team/types';
import { teamTones } from '@/lib/avatar';
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
  /* Ряд дохода по месяцам — ради линии под числом дня; восемь точек с
     запасом на неполный текущий месяц. */
  const financeWindow = { from: new Date(now.getTime() - 9 * 31 * DAY_MS), to: now };

  const [
    bookings,
    tomorrowBookings,
    pendingBookings,
    slots,
    onboarding,
    roster,
    blocks,
    finance,
    services,
  ] = await Promise.all([
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
    /* Линия дохода — украшение ответа, а не сам ответ: её отказ не должен
         ронять день, и без неё карточка остаётся прежней. */
    capabilities.canViewFinance
      ? serverApiFetch<FinanceSummary>(
          `/organizations/${slug}/finance-summary${timeWindowQuery(financeWindow)}`,
        ).catch(() => null)
      : Promise.resolve(null),
    /* Сколько услуг видят клиенты — подпись под «Опубликована»; без ответа
         подпись просто не печатается. */
    capabilities.canManagePage
      ? serverApiFetch<Service[]>(`/organizations/${slug}/services`).catch(() => null)
      : Promise.resolve(null),
  ]);

  const model = todayModel(bookings, slots, now, timeZone, {
    memberId: organization.memberId,
    blocks,
  });
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

  /*
   * Сколько день принесёт, если пойдёт как назначено: сумма по всем визитам,
   * кроме тех, что ещё ждут ответа. Цена берётся снимком услуги — прайс мог
   * измениться после записи, а клиент придёт по той цене, о которой
   * договорились.
   */
  const expected = model.today
    .filter((booking) => booking.status !== 'pending')
    .flatMap((booking) => booking.items)
    .reduce<Record<string, number>>((sums, item) => {
      sums[item.priceCurrencySnapshot] =
        (sums[item.priceCurrencySnapshot] ?? 0) + item.priceAmountSnapshot;
      return sums;
    }, {});
  const expectedLabel = Object.entries(expected)
    .map(([currency, amount]) => formatPrice(amount, currency, locale))
    .join(' · ');

  /*
   * Линейка суток: занятое, свободное и заблокированное на одной шкале. В
   * салоне отрезки красятся тоном человека, и легенда под ней называет
   * людей: на общей ленте вопрос не «занято ли», а «чьё это».
   */
  const tones = team ? teamTones(team.map((member) => member.id)) : {};
  const rail = dayRailModel(model.today, model.intervals, now, timeZone, {
    blocks,
    ...(team
      ? {
          toneOf: (memberId: string) =>
            tones[memberId] ? `var(--tone-${tones[memberId]})` : undefined,
        }
      : {}),
  });
  const railPeople = team
    ? team
        .filter((member) => member.status === 'active')
        .map((member) => ({
          id: member.id,
          name: member.name.split(' ')[0] ?? member.name,
          tone: `var(--tone-${tones[member.id]})`,
        }))
    : undefined;

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
  /* В салоне — кто завтра работает, первыми именами: «Анна и Давис». */
  const tomorrowMembers = team
    ? new Intl.ListFormat(locale, { type: 'conjunction' }).format(
        [...new Set(tomorrowLive.map((booking) => booking.organizationMemberId))]
          .map((id) => team.find((member) => member.id === id)?.name.split(' ')[0])
          .filter((name): name is string => Boolean(name)),
      )
    : '';
  const tomorrowLine =
    tomorrowLive[0] && tomorrowEnd
      ? fmt(tomorrowMembers ? t.workspace.tomorrowLineTeam : t.workspace.tomorrowLine, {
          members: tomorrowMembers,
          bookings: `${tomorrowLive.length} ${plural(locale, tomorrowLive.length, t.common.bookingForms)}`,
          from: formatTime(tomorrowLive[0].startsAt, locale, timeZone),
          to: formatTime(tomorrowEnd, locale, timeZone),
        })
      : t.workspace.tomorrowFree;

  /*
   * «Время» одной строкой прототипа: сколько окон клиент может купить сегодня
   * и на неделе вперёд и сколько мастер спрятала. Сегодняшние — те, что ещё
   * впереди и не заняты визитом (`model.open`).
   */
  const nowMs = now.getTime();
  const timeStats = {
    today: model.open.length,
    ahead: slots.filter(
      (slot) =>
        slot.status === 'available' &&
        !slot.hiddenAt &&
        new Date(slot.startsAt).getTime() > nowMs &&
        !isSameDay(slot.startsAt, now, timeZone),
    ).length,
    hidden: slots.filter((slot) => slot.hiddenAt && new Date(slot.startsAt).getTime() > nowMs)
      .length,
  };

  return (
    <>
      <PageHeader
        title={t.nav.home}
        meta={t.nav.hintHome}
        actions={
          capabilities.canManageBookings ? (
            <NewBookingAction label={t.home.newBooking} />
          ) : undefined
        }
      />

      {onboarding ? <SetupProgressCard slug={slug} status={onboarding} t={t} /> : null}

      <HomeBoard
        slug={slug}
        greeting={greeting(t, accountName, now, timeZone)}
        facts={facts}
        rail={
          rail ? (
            <DayRailStrip
              rail={rail}
              label={t.workspace.dayRail}
              t={t}
              people={railPeople}
              nowLabel={formatTime(now.toISOString(), locale, timeZone)}
            />
          ) : null
        }
        income={
          /* Доход дня мастер салона видит свой — по своим записям, как в
             прототипе; линия тренда из финансов остаётся тем, у кого они есть. */
          (capabilities.canViewFinance || capabilities.canViewOwnPayouts) &&
          model.revenue.length ? (
            <IncomeCard
              label={team ? t.workspace.incomeTodaySalon : t.workspace.incomeToday}
              value={model.revenue
                .map(([currency, amount]) => formatPrice(amount, currency, locale))
                .join(' · ')}
              hint={[
                expectedLabel ? fmt(t.workspace.expectedIncome, { amount: expectedLabel }) : '',
                `${t.workspace.doneFact} ${fmt(t.workspace.doneOf, { done, total: model.today.length })}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              trend={finance?.byMonth.slice(-8).map((month) => month.revenue)}
              trendLabel={t.workspace.incomeTrend}
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
              visibleServices={services?.filter((service) => service.isActive).length}
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
        timeStats={timeStats}
        team={team}
        canManageTeam={capabilities.canManageTeam}
        canManageCalendar={capabilities.canManageCalendar}
        ownDay={!team}
        setupPending={Boolean(onboarding?.nextStep)}
      />
    </>
  );
}
