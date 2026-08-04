import { FinanceScreen } from '@/features/finance/components/finance-screen';
import type { FinanceSummary } from '@/features/finance/types';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { serverApiFetch } from '@/lib/server-api';

interface FinancePageProps {
  params: Promise<{ slug: string }>;
}

export default async function FinancePage({ params }: FinancePageProps) {
  const { slug } = await params;
  const [summary, locale] = await Promise.all([
    serverApiFetch<FinanceSummary>(`/organizations/${slug}/finance-summary`),
    getRequestLocale(),
  ]);
  return <FinanceScreen summary={summary} t={getMessages(locale)} locale={locale} />;
}
