import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { MAX_SERVICE_MINUTES } from './upsert-service.dto';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.name)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(MAX_SERVICE_MINUTES)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SERVICE_MINUTES)
  bufferAfterMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.currency)
  priceCurrency?: string;

  @IsOptional()
  @IsIn(['fixed', 'from'])
  priceType?: 'fixed' | 'from';

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.color)
  color?: string;

  /** `null` clears the photo; `IsOptional` deliberately lets it through unvalidated. */
  @IsOptional()
  @IsUrl()
  @MaxLength(FIELD_LIMITS.url)
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * `null` detaches the service from its category. `IsOptional` lets the
   * null through — validating it as a UUID would make "no category" a 400.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
