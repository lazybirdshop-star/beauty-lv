export interface MonthlyRevenue {
  /** `YYYY-MM` */
  month: string;
  revenue: number;
  bookings: number;
}

export interface ServiceRevenue {
  serviceName: string;
  revenue: number;
  bookings: number;
}

export interface FinanceSummary {
  currency: string;
  totalRevenue: number;
  averageCheck: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  /**
   * Доход за столько же времени непосредственно перед выбранным периодом.
   * `null` для «всего времени»: предыдущего всего времени не существует.
   */
  previousRevenue: number | null;
  byMonth: MonthlyRevenue[];
  byService: ServiceRevenue[];
}
