import { IsBoolean, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

import { FONT_PRESET_KEYS, HERO_STYLES, THEME_PRESET_KEYS } from '@beauty-lv/shared-kernel';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
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

  /* Appearance. Keys are validated against shared-kernel rather than a DB
     enum, so adding a palette is one entry in code, not a migration. */

  @IsOptional()
  @IsIn([...THEME_PRESET_KEYS])
  themePresetKey?: string;

  @IsOptional()
  @IsIn([...FONT_PRESET_KEYS])
  fontPresetKey?: string;

  @IsOptional()
  @IsIn([...HERO_STYLES])
  heroStyle?: string;

  /** Manual colour overrides; `null` clears them back to the preset. */
  @IsOptional()
  @IsObject()
  themeOverrides?: Record<string, string> | null;
}
