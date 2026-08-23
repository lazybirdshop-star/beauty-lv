import { DESIGN_PRESET_KEYS } from '@amolie/shared-kernel';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { FONT_PRESET_KEYS, HERO_STYLES, THEME_PRESET_KEYS } from '@amolie/shared-kernel';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { IsHexColorMap } from '../../../../shared/validation/is-hex-color-map';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(FIELD_LIMITS.url)
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(FIELD_LIMITS.url)
  coverUrl?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(FIELD_LIMITS.email)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.phone)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.shortText)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.handle)
  instagramHandle?: string;

  @IsOptional()
  @IsBoolean()
  showPricesSection?: boolean;

  @IsOptional()
  @IsBoolean()
  showContactsSection?: boolean;

  @IsOptional()
  @IsBoolean()
  autoConfirmBookings?: boolean;

  /**
   * За сколько часов до визита клиент ещё может отменить его сам; `null` —
   * не может вовсе. Потолок в неделю — не про безопасность, а про смысл:
   * правило «отменяйте не позже чем за месяц» не отменяет ничего, оно просто
   * запрещает отмену длинным числом.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  clientCancellationHours?: number | null;

  /* Appearance. Keys are validated against shared-kernel rather than a DB
     enum, so adding a palette is one entry in code, not a migration. */

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  publicDisplayName?: string | null;

  @IsOptional()
  @IsBoolean()
  showAvatar?: boolean;

  @IsOptional()
  @IsIn(['ru', 'lv', 'en'])
  defaultLocale?: string;

  @IsOptional()
  @IsIn([...DESIGN_PRESET_KEYS])
  designPresetKey?: string;

  @IsOptional()
  @IsIn([...THEME_PRESET_KEYS])
  themePresetKey?: string;

  @IsOptional()
  @IsIn([...FONT_PRESET_KEYS])
  fontPresetKey?: string;

  @IsOptional()
  @IsIn([...HERO_STYLES])
  heroStyle?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(FIELD_LIMITS.url)
  backgroundImageUrl?: string | null;

  /**
   * Manual colour overrides; `null` clears them back to the preset.
   *
   * Validated by shape as well as by type. These values are written straight
   * into the `<style>` block of the master's public page, so a value that is
   * not a colour is a stylesheet injection — and `</style>` in one ends the
   * element and makes everything after it markup, on a page her own clients
   * open. `IsObject` alone accepted any string. The same rule already governs
   * the Studio's colour knobs (`sanitizePageDesign`); this applies it at the
   * older editor's door.
   */
  @IsOptional()
  @IsObject()
  @IsHexColorMap()
  themeOverrides?: Record<string, string> | null;
}
