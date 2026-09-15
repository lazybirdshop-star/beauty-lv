import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { FinanceSummary } from './types';

/**
 * Сводка дохода за отрезок — та же, что считает серверная страница
 * «Финансов». Клиенту она нужна ради плитки «Доход за месяц» на странице
 * мастера: число берётся из той же разбивки по людям, чтобы две цифры одного
 * человека на двух экранах не расходились.
 */
export function getFinanceSummary(slug: string, window: TimeWindow): Promise<FinanceSummary> {
  return clientApiFetch<FinanceSummary>(
    `/organizations/${slug}/finance-summary${timeWindowQuery(window)}`,
  );
}
