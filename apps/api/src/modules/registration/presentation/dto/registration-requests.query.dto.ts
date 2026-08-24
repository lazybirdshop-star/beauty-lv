import { REGISTRATION_REQUEST_STATUSES } from '@amolie/shared-kernel';
import { IsIn, IsOptional } from 'class-validator';

import { AdminListQueryDto } from '../../../admin-analytics/presentation/dto/admin-list.query.dto';

export class RegistrationRequestsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(REGISTRATION_REQUEST_STATUSES)
  status?: (typeof REGISTRATION_REQUEST_STATUSES)[number];
}
