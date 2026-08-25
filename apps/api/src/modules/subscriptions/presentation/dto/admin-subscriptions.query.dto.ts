import { IsIn, IsOptional } from 'class-validator';

import { AdminListQueryDto } from '../../../admin-analytics/presentation/dto/admin-list.query.dto';

const SUBSCRIPTION_STATUSES = ['active', 'frozen', 'cancelled'] as const;

export class AdminSubscriptionsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  status?: (typeof SUBSCRIPTION_STATUSES)[number];
}
