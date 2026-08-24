import type { Metadata } from 'next';
import { FinanceScreen } from '@/features/finance/components/finance-screen';
import type { FinanceSummary } from '@/features/finance/types';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { serverApiFetch } from '@/lib/server-api';

interface FinancePageProps {
  params: Promise<{ slug: string }>;
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

export default async function FinancePage({ params }: FinancePageProps) {
  const { slug } = await params;
  const [summary, locale] = await Promise.all([
    serverApiFetch<FinanceSummary>(`/organizations/${slug}/finance-summary`),
    getRequestLocale(),
  ]);
  return <FinanceScreen summary={summary} t={getMessages(locale)} locale={locale} />;
}
