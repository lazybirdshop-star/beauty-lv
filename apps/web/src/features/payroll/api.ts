import { clientApiFetch } from '@/lib/client-api';

export type CompensationType = 'percent' | 'chair_rent' | 'salary_plus_percent';
export type RentPeriod = 'day' | 'week' | 'month';
export type PayoutStatus = 'draft' | 'approved' | 'paid';

/** Условия расчёта с мастером. Суммы в центах, процент в базисных пунктах. */
export interface Compensation {
  id: string;
  organizationMemberId: string;
  memberName: string;
  type: CompensationType;
  percentBps: number | null;
  rentAmount: number | null;
  rentPeriod: RentPeriod | null;
  /** Оклад в месяц. */
  salaryAmount: number | null;
  currency: string;
  /** Гражданский день, с которого действуют. */
  effectiveFrom: string;
  createdAt: string;
}

export interface CompensationInput {
  organizationMemberId: string;
  type: CompensationType;
  percentBps?: number;
  rentAmount?: number;
  rentPeriod?: RentPeriod;
  salaryAmount?: number;
  effectiveFrom: string;
}

/** Отрезок периода с одними условиями — как посчитана ведомость. */
export interface PayoutSegment {
  from: string;
  to: string;
  days: number;
  compensationId: string | null;
  type: CompensationType | null;
  percentBps: number | null;
  rentAmount: number | null;
  rentPeriod: RentPeriod | null;
  salaryAmount: number | null;
  revenue: number;
  bookings: number;
  master: number;
  salon: number;
}

export interface Payout {
  id: string;
  organizationMemberId: string;
  memberName: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  revenueAmount: number;
  bookingsCount: number;
  masterAmount: number;
  salonAmount: number;
  breakdown: PayoutSegment[];
  status: PayoutStatus;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function listCompensation(slug: string): Promise<Compensation[]> {
  return clientApiFetch<Compensation[]>(`/organizations/${slug}/compensation`);
}

export function createCompensation(
  slug: string,
  input: CompensationInput,
): Promise<{ id: string }> {
  return clientApiFetch<{ id: string }>(`/organizations/${slug}/compensation`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Ведомости, задевающие отрезок; без отрезка — все доступные. */
export function listPayouts(
  slug: string,
  range: { from?: string; to?: string } = {},
): Promise<Payout[]> {
  const query = new URLSearchParams();
  if (range.from) query.set('from', range.from);
  if (range.to) query.set('to', range.to);
  const suffix = query.size ? `?${query.toString()}` : '';
  return clientApiFetch<Payout[]>(`/organizations/${slug}/payouts${suffix}`);
}

export function calculatePayouts(
  slug: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ payouts: Payout[]; lockedCount: number }> {
  return clientApiFetch<{ payouts: Payout[]; lockedCount: number }>(
    `/organizations/${slug}/payouts/calculate`,
    { method: 'POST', body: JSON.stringify({ periodStart, periodEnd }) },
  );
}

export function approvePayout(slug: string, payoutId: string) {
  return clientApiFetch(`/organizations/${slug}/payouts/${payoutId}/approve`, { method: 'PATCH' });
}

export function markPayoutPaid(slug: string, payoutId: string) {
  return clientApiFetch(`/organizations/${slug}/payouts/${payoutId}/paid`, { method: 'PATCH' });
}

export function deletePayoutDraft(slug: string, payoutId: string) {
  return clientApiFetch(`/organizations/${slug}/payouts/${payoutId}`, { method: 'DELETE' });
}
