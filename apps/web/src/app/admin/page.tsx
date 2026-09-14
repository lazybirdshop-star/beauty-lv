import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { Funnel, type AdminFunnel } from '@/features/admin/home/components/funnel';
import { OverviewPeriod } from '@/features/admin/home/components/overview-period';
import { OverviewStats, type OverviewCell } from '@/features/admin/home/components/overview-stats';
import { WeekBars } from '@/features/admin/home/components/week-bars';
import { fillWeeks, weekBars, type WeeklyPoint } from '@/features/admin/home/weekly-series';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { fmt, plural } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { serverApiFetch } from '@/lib/server-api';

interface AdminWeeklyTrends {
  registrations: WeeklyPoint[];
  bookings: WeeklyPoint[];
}

/**
 * Сколько недель показывают графики. То же число, что просит API
 * (`getWeeklyTrends(12)`), — ряд достраивается до него нулями, потому что
 * `GROUP BY` отдаёт только недели со строками.
 */
const TREND_WEEKS = 12;

interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
  /*
   * Три поля ниже появились вместе с переключателем периода и приходят не от
   * всякого API: веб и API деплоятся раздельно, и между двумя выкатами новый
   * кабинет разговаривает со старым сервером. Поэтому они необязательные, а
   * экран умеет обойтись прежним `newRegistrationsLast7Days`.
   */
  windowDays?: number;
  newRegistrations?: number;
  previousRegistrations?: number;
}

/** Окна сводки — те же, что принимает API. */
const WINDOWS = [7, 30, 90] as const;
type Window = (typeof WINDOWS)[number];

function parseWindow(value: string | undefined): Window {
  const days = Number(value);
  return (WINDOWS as readonly number[]).includes(days) ? (days as Window) : 7;
}

/**
 * Насколько регистраций стало больше, чем за такой же срок перед этим.
 *
 * Три случая из четырёх — не проценты, ровно как в финансах мастера: рост с
 * нуля не «+∞%», равные числа не «+0%», а отсутствие предыдущего окна значит,
 * что сравнивать не с чем.
 */
function delta(summary: AdminDashboardSummary, t: Messages): { text: string; up: boolean } | null {
  const now = summary.newRegistrations;
  const before = summary.previousRegistrations;
  if (now === undefined || before === undefined) return null;
  if (before === 0) return now > 0 ? { text: t.adminHome.deltaNew, up: true } : null;

  const change = now - before;
  if (change === 0) return { text: t.adminHome.deltaSame, up: true };

  const percent = Math.max(1, Math.round((Math.abs(change) / before) * 100));
  return {
    text: fmt(change > 0 ? t.adminHome.deltaUp : t.adminHome.deltaDown, { percent }),
    up: change > 0,
  };
}

/**
 * Сводка платформы — прототип «Кабинет 2026», экран `admin-home`.
 *
 * Двенадцать колонок. Сверху розовой ячейкой — заявки, которые никто не
 * разобрал: они важнее любого числа под ними, и полосы нет, когда делать
 * нечего. Ниже четыре плитки (мастера, салоны, клиенты, подписки), записи по
 * неделям столбиками и шаги мастера, внизу — регистрации за выбранный срок,
 * записи за всё время и вход в состояние платформы.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const window = parseWindow(days);

  const [summary, trends, funnel, locale] = await Promise.all([
    serverApiFetch<AdminDashboardSummary>(`/admin/summary?days=${window}`),
    serverApiFetch<AdminWeeklyTrends>('/admin/trends'),
    serverApiFetch<AdminFunnel>('/admin/funnel'),
    getRequestLocale(),
  ]);
  const t = getMessages(locale);
  const number = new Intl.NumberFormat(locale);

  const bookingBars = weekBars(
    fillWeeks(trends.bookings, TREND_WEEKS),
    locale,
    t.adminHome.bookingsUnit,
  );

  /* Записи за последнюю полную неделю и за предыдущую — подпись под
     столбиками. */
  const thisWeek = bookingBars[bookingBars.length - 1]?.value ?? 0;
  const lastWeek = bookingBars[bookingBars.length - 2]?.value ?? 0;
  const weekChange = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const registrations = summary.newRegistrations ?? summary.newRegistrationsLast7Days;
  const trend = delta(summary, t);

  /* Числа, которые платформа действительно ведёт, — ни одно не выдумано:
     «пробного периода» и «отмен за неделю» в сводке API нет. */
  const cells: OverviewCell[] = [
    {
      label: t.adminHome.masters,
      value: number.format(summary.mastersCount),
      hint: fmt(t.adminHome.mastersHint, { count: funnel.withPublishedPage }),
    },
    {
      label: t.adminHome.organizations,
      value: number.format(summary.organizationsCount),
      hint: fmt(t.adminHome.organizationsHint, { count: funnel.withServices }),
    },
    {
      label: t.adminHome.clients,
      value: number.format(summary.clientsCount),
      hint: t.adminHome.clientsHint,
    },
    {
      label: t.adminHome.subscriptions,
      value: number.format(summary.activeSubscriptionsCount),
      hint: fmt(t.adminHome.subscriptionsHint, { count: summary.organizationsCount }),
    },
  ];

  const today = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <>
      <PageHeader
        title={t.nav.overview}
        meta={today}
        actions={<OverviewPeriod current={window} t={t} />}
      />

      <div className="admin-grid">
        {funnel.requests.pending > 0 ? (
          <Card tone="free" className="span-12 admin-queue">
            <div className="admin-queue__text">
              <p className="admin-queue__title">
                {funnel.requests.pending}{' '}
                {plural(locale, funnel.requests.pending, {
                  zero: t.adminHome.requestsWaitingMany,
                  one: t.adminHome.requestsWaitingOne,
                  few: t.adminHome.requestsWaitingFew,
                  many: t.adminHome.requestsWaitingMany,
                  other: t.adminHome.requestsWaitingMany,
                })}
              </p>
              <p className="admin-queue__hint">{t.adminHome.requestsWaitingHint}</p>
            </div>
            <Button asChild size="sm">
              <Link href="/admin/registration-requests">
                <Icon name="inbox" className="ico-18" />
                <span>{t.adminHome.openQueue}</span>
              </Link>
            </Button>
          </Card>
        ) : null}

        <OverviewStats cells={cells} />

        <Card className="span-7">
          <CardHeader>
            <div>
              <CardTitle>{t.adminHome.bookingsPerWeek}</CardTitle>
              <CardHint>{fmt(t.adminHome.weeksAll, { weeks: TREND_WEEKS })}</CardHint>
            </div>
          </CardHeader>
          <WeekBars bars={bookingBars} label={t.adminHome.bookingsPerWeek} />
          <p className="admin-footnote tnum">
            {t.adminHome.bookingsWeek}: {number.format(thisWeek)} ·{' '}
            {weekChange === null
              ? t.adminHome.bookingsWeekFirst
              : fmt(t.adminHome.bookingsWeekHint, {
                  percent: `${weekChange > 0 ? '+' : ''}${weekChange}`,
                })}
          </p>
        </Card>

        <Funnel funnel={funnel} t={t} className="span-5" />

        <Card className="span-4">
          <p className="stat-cell__label">
            {fmt(t.adminHome.registrationsWindow, { days: window })}
          </p>
          <p className="stat-cell__value tnum">{number.format(registrations)}</p>
          {trend ? (
            <p className={trend.up ? 'stat-cell__hint is-up' : 'stat-cell__hint is-down'}>
              {trend.text}
            </p>
          ) : null}
        </Card>

        <Card className="span-4">
          <p className="stat-cell__label">{t.adminHome.bookings}</p>
          <p className="stat-cell__value tnum">{number.format(summary.bookingsCount)}</p>
          <p className="stat-cell__hint">{t.adminHome.bookingsHint}</p>
        </Card>

        <Card className="span-4">
          <CardHeader>
            <div>
              <CardTitle>{t.adminHome.healthTitle}</CardTitle>
              <CardHint>{t.adminHome.healthHint}</CardHint>
            </div>
            <Link className="cell-link" href="/admin/health">
              {t.nav.health}
            </Link>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
