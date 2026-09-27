import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Booking } from '@/features/bookings/types';
import type { TeamMember } from '@/features/team/types';
import type { CompletedRow } from '@/features/finance/components/completed-table';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { FinanceScreen } from '@/features/finance/components/finance-screen';
import { financePeriodWindow, parseFinancePeriod } from '@/features/finance/period';
import { serviceRates } from '@/features/finance/service-yield';
import type { FinanceSummary } from '@/features/finance/types';
import { dayKey, formatDayShort, formatTime } from '@/lib/format';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { timeWindowQuery } from '@/lib/time-window';

interface FinancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

/**
 * Свой заголовок вкладки.
 *
 * Все девять экранов кабинета назывались «AMOLIE»: в истории браузера, в
 * переключателе вкладок и в списке задач PWA они были неразличимы. Имя берётся
 * из того же словаря, что и подпись шапки, — два разных названия одного экрана
 * были бы новым расхождением вместо исправленного.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.nav.finance };
}

export default async function FinancePage({ params, searchParams }: FinancePageProps) {
  const [{ slug }, { period: rawPeriod }] = await Promise.all([params, searchParams]);

  /* Период — в адресе, а не в состоянии компонента: экран серверный, и каждая
     цифра на нём должна приезжать уже посчитанной за нужный срок. Незнакомое
     значение из адреса — это «месяц», а не пустой экран. */
  const period = parseFinancePeriod(rawPeriod);

  /* Пояс салона: месяц мастера начинается в полночь её города. Запрос
     бесплатный — layout кабинета уже спросил то же самое, а
     `requireOrganization` мемоизирована на проход рендера. */
  const organization = await requireOrganization(slug);
  const capabilities = capabilitiesOf(organization);
  /* Сводка дохода заведения — область «всей организации» (SALON.md §3.3).
     Наёмный мастер видит свой заработок на `/finance/payouts`, и сюда по
     прямому адресу не заходит: сервер ответил бы тем же. */
  if (!capabilities.canViewFinance) notFound();
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;
  const window = financePeriodWindow(period, timeZone);

  /* Записи периода — ради списка, который объясняет сумму. Тем же окном, что
     и сводка: две цифры на одном экране обязаны быть про один срок. */
  const [summary, bookings, locale, team] = await Promise.all([
    serverApiFetch<FinanceSummary>(
      `/organizations/${slug}/finance-summary${timeWindowQuery(window)}`,
    ),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(window)}`),
    getRequestLocale(),
    /* Состав — ради одного: тон человека в таблице дохода обязан совпасть с
       его дорожкой в календаре. Карта тонов разводит столкновения по порядку
       списка, поэтому считать её по тем, у кого был доход, нельзя. Отказ не
       роняет экран: без состава тон берётся из самой таблицы. */
    capabilities.hasTeam
      ? serverApiFetch<TeamMember[]>(`/organizations/${slug}/team${timeWindowQuery(window)}`).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  const messages = getMessages(locale);
  /* В сумму входят только завершённые визиты — те же, что считает сводка. */
  const completed: CompletedRow[] = bookings
    .filter((booking) => booking.status === 'completed')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((booking) => {
      const startsAt = new Date(booking.startsAt);
      return {
        id: booking.id,
        /* «12 сен» — три буквы месяца без точки, как в прототипе. */
        day: formatDayShort(startsAt, locale, timeZone, false),
        /* Общий форматтер: свой `Intl` давал английскому кабинету «06:30 PM». */
        time: formatTime(startsAt, locale, timeZone),
        dateKey: dayKey(startsAt, timeZone),
        memberId: booking.organizationMemberId,
        clientName: booking.guestName || messages.home.guest,
        serviceName: booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
        amount: booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0),
        minutes: booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30,
      };
    });

  /* Час кресла по услугам — из состава тех же завершённых визитов: у услуги
     берутся и её деньги, и её минуты, чего в сводке по услугам нет. Считается
     на сервере: в браузер уезжает несколько строк, а не все позиции периода. */
  const rates = serviceRates(
    bookings
      .filter((booking) => booking.status === 'completed')
      .flatMap((booking) =>
        booking.items.map((item) => ({
          name: item.serviceNameSnapshot,
          revenue: item.priceAmountSnapshot,
          minutes: item.durationMinutesSnapshot,
        })),
      ),
  );

  return (
    <FinanceScreen
      summary={summary}
      completed={completed}
      rates={rates}
      t={messages}
      locale={locale}
      period={period}
      basePath={`/${slug}/dashboard/finance`}
      slug={slug}
      today={dayKey(new Date(), timeZone)}
      hasTeam={capabilities.hasTeam}
      memberOrder={team?.map((member) => member.id)}
      payoutsHref={
        capabilities.canManagePayouts && capabilities.hasTeam
          ? `/${slug}/dashboard/finance/payouts`
          : undefined
      }
    />
  );
}
