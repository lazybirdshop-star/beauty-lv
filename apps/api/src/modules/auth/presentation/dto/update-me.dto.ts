import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const SUPPORTED_LOCALES = ['ru', 'lv', 'en'] as const;

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
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
