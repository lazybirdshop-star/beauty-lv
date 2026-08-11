import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

const MASTER_SETTABLE_STATUSES = [
  'confirmed',
  'completed',
  'cancelled_by_master',
  'no_show',
] as const;

export class UpdateBookingStatusDto {
  @IsIn(MASTER_SETTABLE_STATUSES)
  status!: (typeof MASTER_SETTABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.shortText)
  cancellationReason?: string;
}
