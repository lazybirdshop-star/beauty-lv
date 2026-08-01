import { IsIn, IsOptional, IsString } from 'class-validator';

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
  cancellationReason?: string;
}
