import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @IsOptional()
  @IsIn(['fixed', 'from'])
  priceType?: 'fixed' | 'from';

  @IsOptional()
  @IsString()
  color?: string;

  /** `null` clears the photo; `IsOptional` deliberately lets it through unvalidated. */
  @IsOptional()
  @IsUrl()
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
