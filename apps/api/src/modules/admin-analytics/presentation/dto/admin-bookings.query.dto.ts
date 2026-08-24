import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

import { AdminListQueryDto } from './admin-list.query.dto';

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
] as const;

export class AdminBookingsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];

  /**
   * Полуинтервал `[from, to)` по времени визита — то же правило, что у окон
   * кабинета: закрытый справа отрезок отдал бы полночь обоим смежным дням.
   */
  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  from?: string;

  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  to?: string;
}
