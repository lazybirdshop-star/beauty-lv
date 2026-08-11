import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

const SUPPORTED_LOCALES = ['ru', 'lv', 'en'] as const;

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.name)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.phone)
  phone?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: (typeof SUPPORTED_LOCALES)[number];

  @IsOptional()
  @IsBoolean()
  smsRemindersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailRemindersEnabled?: boolean;
}
