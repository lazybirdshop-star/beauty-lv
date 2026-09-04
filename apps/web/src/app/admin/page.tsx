import { Funnel, type AdminFunnel } from '@/features/admin/home/components/funnel';
import { OverviewPeriod } from '@/features/admin/home/components/overview-period';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { OverviewStats, type OverviewCell } from '@/features/admin/home/components/overview-stats';
import { WeekBars } from '@/features/admin/home/components/week-bars';
import { WeekLine } from '@/features/admin/home/components/week-line';
import { fillWeeks, weekBars, type WeeklyPoint } from '@/features/admin/home/weekly-series';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { fmt, plural } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { serverApiFetch } from '@/lib/server-api';
import Link from 'next/link';

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

  const registrationBars = weekBars(
    fillWeeks(trends.registrations, TREND_WEEKS),
    locale,
    t.adminHome.registrationsUnit,
  );
  const bookingBars = weekBars(
    fillWeeks(trends.bookings, TREND_WEEKS),
    locale,
    t.adminHome.bookingsUnit,
  );

  /* Записи за последнюю полную неделю и за предыдущую — для ячейки «за
     неделю» и её знаменателя. */
  const thisWeek = bookingBars[bookingBars.length - 1]?.value ?? 0;
  const lastWeek = bookingBars[bookingBars.length - 2]?.value ?? 0;
  const weekChange = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const registrations = summary.newRegistrations ?? summary.newRegistrationsLast7Days;
  const trend = delta(summary, t);

  /*
   * Шесть чисел платформы. Пятая и шестая ячейки макета — «подписки на пробном
   * периоде» и «отмены за неделю» — у продукта не считаются: пробного периода
   * в модели подписки нет, а отмен нет в сводке API. На их месте стоят числа,
   * которые платформа действительно ведёт, и ни одно из них не выдумано.
   */
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
      label: t.adminHome.bookingsWeek,
      value: number.format(thisWeek),
      hint:
        weekChange === null
          ? t.adminHome.bookingsWeekFirst
          : fmt(t.adminHome.bookingsWeekHint, {
              percent: `${weekChange > 0 ? '+' : ''}${weekChange}`,
            }),
    },
    {
      label: t.adminHome.subscriptions,
      value: number.format(summary.activeSubscriptionsCount),
      hint: fmt(t.adminHome.subscriptionsHint, { count: summary.organizationsCount }),
    },
    {
      label: t.adminHome.bookings,
      value: number.format(summary.bookingsCount),
      hint: t.adminHome.bookingsHint,
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

      {/* Полосы работы — над числами: заявка, которую никто не разобрал,
          важнее любого из шести чисел под ней. Полосы нет, когда делать
          нечего: пустое «0 заявок ждут» приучает пролистывать место, где
          однажды появится настоящая работа. */}
      <div className="admin-strips">
        {funnel.requests.pending > 0 ? (
          <div className="admin-strip is-amber">
            <span style={{ color: 'var(--amber)' }}>
              <Icon name="inbox" className="ico-18" />
            </span>
            <div className="col" style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {funnel.requests.pending}{' '}
                {plural(locale, funnel.requests.pending, {
                  zero: t.adminHome.requestsWaitingMany,
                  one: t.adminHome.requestsWaitingOne,
                  few: t.adminHome.requestsWaitingFew,
                  many: t.adminHome.requestsWaitingMany,
                  other: t.adminHome.requestsWaitingMany,
                })}
              </span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {t.adminHome.requestsWaitingHint}
              </span>
            </div>
            <Link className="btn btn-primary btn-sm" href="/admin/registration-requests">
              <Icon name="arrowR" className="ico-18" />
              <span>{t.adminHome.openQueue}</span>
            </Link>
          </div>
        ) : null}

        <div className="admin-strip">
          <span style={{ color: 'var(--green)' }}>
            <Icon name="activity" className="ico-18" />
          </span>
          <div className="col" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t.adminHome.healthTitle}</span>
            <span className="t-meta" style={{ fontSize: 12.5 }}>
              {t.adminHome.healthHint}
            </span>
          </div>
          <Link className="btn btn-secondary btn-sm" href="/admin/health">
            <span>{t.nav.health}</span>
          </Link>
        </div>
      </div>

      <div className="admin-top">
        <div className="card card-lg admin-reg">
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="t-meta" style={{ fontSize: 13 }}>
              {fmt(t.adminHome.registrationsWindow, { days: window })}
            </span>
            {trend ? (
              <span className={trend.up ? 'badge b-green' : 'badge b-amber'}>{trend.text}</span>
            ) : null}
          </div>
          <span className="t-metric" style={{ margin: '2px 0 4px' }}>
            {number.format(registrations)}
          </span>
          <span className="t-meta" style={{ fontSize: 12.5, marginBottom: 10 }}>
            {fmt(t.adminHome.weeklyCaption, { weeks: TREND_WEEKS })}
          </span>
          <div style={{ marginTop: 'auto' }}>
            <WeekBars bars={registrationBars} />
          </div>
        </div>

        <OverviewStats cells={cells} />
      </div>

      <div className="admin-bottom">
        <Funnel funnel={funnel} t={t} />

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="t-section" style={{ fontSize: 15 }}>
              {t.adminHome.bookingsPerWeek}
            </span>
            <span className="t-meta">{fmt(t.adminHome.weeksAll, { weeks: TREND_WEEKS })}</span>
          </div>
          <WeekLine
            points={bookingBars.map((bar) => ({
              label: bar.label,
              title: bar.title,
              value: bar.value,
            }))}
            emptyLabel={t.common.chartEmpty}
          />
        </div>
      </div>
    </>
  );
}
