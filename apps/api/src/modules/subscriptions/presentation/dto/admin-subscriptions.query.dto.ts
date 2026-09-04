import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { AdminListQueryDto } from '../../../admin-analytics/presentation/dto/admin-list.query.dto';

const SUBSCRIPTION_STATUSES = ['active', 'frozen', 'cancelled'] as const;

export class AdminSubscriptionsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  status?: (typeof SUBSCRIPTION_STATUSES)[number];

  /**
   * Состояние подписки вместе с её отсутствием.
   *
   * Отдельно от `status`: «нет подписки» — не значение колонки, а её NULL, и
   * подмешивать его в enum статусов значило бы обещать базе значение, которого
   * в ней нет.
   */
  @IsOptional()
  @IsIn([...SUBSCRIPTION_STATUSES, 'none'])
  state?: (typeof SUBSCRIPTION_STATUSES)[number] | 'none';

  @IsOptional()
  @IsUUID()
  planId?: string;

  /** Продление: в ближайшие 30 дней или уже прошло. */
  @IsOptional()
  @IsIn(['soon', 'passed'])
  renews?: 'soon' | 'passed';
}
