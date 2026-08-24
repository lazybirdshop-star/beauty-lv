import type { Metadata } from 'next';
import { FinanceScreen } from '@/features/finance/components/finance-screen';
import { financePeriodWindow, parseFinancePeriod } from '@/features/finance/period';
import type { FinanceSummary } from '@/features/finance/types';
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
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;
  const window = financePeriodWindow(period, timeZone);

  const [summary, locale] = await Promise.all([
    serverApiFetch<FinanceSummary>(
      `/organizations/${slug}/finance-summary${timeWindowQuery(window)}`,
    ),
    getRequestLocale(),
  ]);

  return (
    <FinanceScreen
      summary={summary}
      t={getMessages(locale)}
      locale={locale}
      period={period}
      basePath={`/${slug}/dashboard/finance`}
    />
  );
}
