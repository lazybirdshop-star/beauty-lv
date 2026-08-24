import { REGISTRATION_MODES } from '@amolie/shared-kernel';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Values are stored as strings because the settings table is a key-value
 * singleton (see PlatformSettingsRepository) — `max_services_per_master` is a
 * number written as text, not a number.
 */
export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  site_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  seo_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.email)
  support_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.phone)
  support_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.numericText)
  max_services_per_master?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.currency)
  default_currency?: string;

  /**
   * Единственная настройка с закрытым списком значений: остальные — свободный
   * текст, а эта решает, впускает ли платформа кого угодно. Опечатка в ней не
   * должна означать «открыто».
   */
  @IsOptional()
  @IsIn(REGISTRATION_MODES)
  registration_mode?: (typeof REGISTRATION_MODES)[number];
}
