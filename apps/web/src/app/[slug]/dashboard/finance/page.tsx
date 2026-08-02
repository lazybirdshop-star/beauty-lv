import { FinanceScreen } from '@/features/finance/components/finance-screen';
import type { FinanceSummary } from '@/features/finance/types';
import { serverApiFetch } from '@/lib/server-api';

interface FinancePageProps {
  params: Promise<{ slug: string }>;
}

export default async function FinancePage({ params }: FinancePageProps) {
  const { slug } = await params;
  const summary = await serverApiFetch<FinanceSummary>(`/organizations/${slug}/finance-summary`);
  return <FinanceScreen summary={summary} />;
}
