import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

import {
  BOOKING_OWNER_FILTERS,
  type BookingOwnerFilter,
} from '../../infrastructure/bookings-admin.repository';
import { AdminListQueryDto } from './admin-list.query.dto';

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
] as const;

/** Источники записи — значения enum `booking_source`. */
const BOOKING_SOURCES = ['public_page', 'admin_manual', 'marketplace'] as const;

export class AdminBookingsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];

  /** Откуда пришла запись: страница записи, кабинет мастера или витрина. */
  @IsOptional()
  @IsIn(BOOKING_SOURCES)
  source?: (typeof BOOKING_SOURCES)[number];

  /** Кто ведёт запись: мастер-одиночка или салон с командой. */
  @IsOptional()
  @IsIn(BOOKING_OWNER_FILTERS)
  ownerType?: BookingOwnerFilter;

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
