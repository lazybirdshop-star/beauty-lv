import { BarChart, type BarChartPoint } from '@/components/ui/bar-chart';
import { Funnel, type AdminFunnel } from '@/features/admin/home/components/funnel';
import { AttentionRow } from '@/features/admin/home/components/attention-row';
import { Card, CardLabel } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { LeadMetric } from '@/components/ui/lead-metric';
import { Rise, RISE_GROUP, RISE_ITEM } from '@/components/ui/rise';
import { StatTile } from '@/components/ui/stat-tile';
import { fmt } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import type { Messages } from '@/lib/i18n/messages';
import { serverApiFetch } from '@/lib/server-api';

interface WeeklyPoint {
  week: string;
  value: number;
}

interface AdminWeeklyTrends {
  registrations: WeeklyPoint[];
  bookings: WeeklyPoint[];
}

function weekPoints(points: WeeklyPoint[], locale: string, t: Messages): BarChartPoint[] {
  const weekFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return points.map((point) => {
    const date = new Date(`${point.week}T00:00:00`);
    return {
      label: String(date.getDate()),
      title: fmt(t.adminHome.weekOf, { date: weekFormatter.format(date) }),
      value: point.value,
    };
  });
}

interface AdminDashboardSummary {
  mastersCount: number;
  clientsCount: number;
  organizationsCount: number;
  newRegistrationsLast7Days: number;
  bookingsCount: number;
  activeSubscriptionsCount: number;
}

interface MetricSpec {
  key: keyof AdminDashboardSummary;
  label: string;
  hint: string;
  /** Раздел, в котором это число раскрывается списком. */
  href: string;
  /** Ряд недель за тем же числом — там, где платформа его ведёт. */
  trend?: number[];
  trendLabel?: string;
  /** Роль ячейки в бенто: розовая — про то, что пришло и ждёт. */
  fill?: 'rose' | 'lilac';
}

/**
 * Числа второго ряда — те, что отвечают на «сколько», а не «куда идёт».
 *
 * Раньше их было шесть, они стояли двумя равными группами под заголовками
 * «Масштаб платформы» и «Динамика», и вопрос «с чего смотреть» экран не решал
 * вовсе: шесть одинаковых плиток спрашивают глаз шесть раз одинаково громко.
 * Теперь иерархию несёт композиция — ведущая ячейка вдвое крупнее соседних, —
 * а не два подзаголовка над одинаковыми рядами. Смысл прежней группировки при
 * этом сохранён: подписи под числами говорят то же, что говорили заголовки.
 *
 * Знаменатель — там, где он честный. «Мастеров 128» — это много или мало,
 * зависит от того, сколько из них дошло до страницы записи; это число у экрана
 * уже есть, оно приходит с воронкой. Клиентам и записям сравнивать не с чем, и
 * выдумывать им знаменатель не стали.
 */
function metrics(t: Messages, trends: AdminWeeklyTrends, funnel: AdminFunnel): MetricSpec[] {
  return [
    {
      key: 'mastersCount',
      label: t.adminHome.masters,
      hint: fmt(t.adminHome.mastersWithPage, { count: funnel.withPublishedPage }),
      href: '/admin/masters',
    },
    {
      key: 'clientsCount',
      label: t.adminHome.clients,
      hint: t.adminHome.clientsHint,
      href: '/admin/users',
    },
    {
      key: 'organizationsCount',
      label: t.adminHome.organizations,
      hint: t.adminHome.organizationsHint,
      href: '/admin/organizations',
    },
    {
      key: 'newRegistrationsLast7Days',
      label: t.adminHome.newAccounts,
      hint: t.adminHome.newAccountsHint,
      href: '/admin/users',
      trend: trends.registrations.map((point) => point.value),
      trendLabel: t.adminHome.registrationsCaption,
      fill: 'rose' as const,
    },
    {
      key: 'activeSubscriptionsCount',
      label: t.adminHome.subscriptions,
      hint: fmt(t.adminHome.subscriptionsOf, { count: funnel.masters }),
      href: '/admin/subscriptions',
    },
  ];
}

export default async function AdminDashboardPage() {
  const [summary, trends, funnel, locale] = await Promise.all([
    serverApiFetch<AdminDashboardSummary>('/admin/summary'),
    serverApiFetch<AdminWeeklyTrends>('/admin/trends'),
    serverApiFetch<AdminFunnel>('/admin/funnel'),
    getRequestLocale(),
  ]);
  const t = getMessages(locale);

  return (
    <div className="flex flex-col gap-8">
      {/* Сначала работа, потом отчёт: заявка, которую никто не разобрал,
          важнее любого из шести чисел под ней. Строки нет, когда делать
          нечего. */}
      <Rise>
        <AttentionRow pending={funnel.requests.pending} locale={locale} t={t} />
      </Rise>

      {/*
       * Сетка разного веса, а не ряд одинаковых плиток.
       *
       * Ведущая ячейка занимает две колонки и две строки и держит внутри тот
       * самый график, который раньше стоял отдельной карточкой ниже: «записей
       * 412» и «как они шли двенадцать недель» — это один ответ, а не два
       * блока в разных концах экрана. Остальные пять чисел идут мелко.
       *
       * Ячейки лежат на подносе с зазором 12px — тем же, что на главной
       * кабинета мастера: панель и кабинет говорят одним языком.
       */}
      <Rise delay={RISE_GROUP} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <LeadMetric
          label={t.adminHome.bookings}
          value={<CountUp to={summary.bookingsCount} locale={locale} delay={RISE_GROUP} />}
          hint={t.adminHome.bookingsHint}
          className="col-span-2 lg:row-span-2"
          chart={
            <BarChart
              data={weekPoints(trends.bookings, locale, t)}
              formatValue={(value) => `${value}`}
              caption={t.adminHome.bookingsCaption}
              emptyLabel={t.common.chartEmpty}
            />
          }
        />
        {metrics(t, trends, funnel).map((metric, index) => (
          <StatTile
            key={metric.key}
            label={metric.label}
            /* Число доводится пружиной от нуля — та же лесенка, что у
               появления самой группы. */
            value={
              <CountUp
                to={summary[metric.key]}
                locale={locale}
                delay={RISE_GROUP + index * RISE_ITEM}
              />
            }
            hint={metric.hint}
            href={metric.href}
            trend={metric.trend}
            trendLabel={metric.trendLabel}
            fill={metric.fill}
            delay={RISE_GROUP + index * RISE_ITEM}
            /* Пятая плитка на телефоне остаётся одна в ряду — она занимает обе
               колонки, чтобы ряд не обрывался половиной. */
            className={index === 4 ? 'col-span-2 lg:col-span-1' : undefined}
          />
        ))}
      </Rise>

      {/*
       * Воронка и регистрации стоят рядом, потому что отвечают на один вопрос:
       * сколько людей приходит и сколько из них доходит до работы. Объёмы выше
       * говорят, какого размера платформа, и об этом молчат.
       */}
      <Rise delay={RISE_GROUP * 2}>
        <h2 className="mb-3 font-display text-[22px] leading-none text-ink">{t.funnel.title}</h2>
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr] lg:items-start">
          <Funnel funnel={funnel} t={t} />
          <Card className="flex flex-col gap-4">
            <CardLabel>{t.adminHome.registrations}</CardLabel>
            <BarChart
              data={weekPoints(trends.registrations, locale, t)}
              formatValue={(value) => `${value}`}
              caption={t.adminHome.registrationsCaption}
              emptyLabel={t.common.chartEmpty}
            />
          </Card>
        </div>
      </Rise>
    </div>
  );
}
