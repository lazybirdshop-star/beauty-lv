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
  byMonth: MonthlyRevenue[];
  byService: ServiceRevenue[];
}
