import { REGISTRATION_MODES, USER_LOCALES } from '@amolie/shared-kernel';
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

  @IsOptional()
  @IsIn(USER_LOCALES)
  default_locale?: (typeof USER_LOCALES)[number];

  /**
   * Часовой пояс проверяется самим движком времени, а не списком в коде:
   * список стран стареет, а `Intl` знает актуальный.
   */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  default_timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.numericText)
  booking_window_days?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  mail_sender_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.email)
  mail_reply_to?: string;

  /*
   * Два выключателя «опасной зоны». Закрытый список значений, как у режима
   * регистрации: опечатка в них не должна означать «платформа закрыта».
   */
  @IsOptional()
  @IsIn(['0', '1'])
  maintenance_mode?: '0' | '1';

  @IsOptional()
  @IsIn(['0', '1'])
  bookings_paused?: '0' | '1';
}
