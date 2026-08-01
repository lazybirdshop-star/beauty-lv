import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
