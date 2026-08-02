import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertServiceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number;

  @IsInt()
  @Min(0)
  priceAmount!: number;

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
}
