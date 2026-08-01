import { IsOptional, IsString } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  site_name?: string;

  @IsOptional()
  @IsString()
  seo_description?: string;

  @IsOptional()
  @IsString()
  support_email?: string;

  @IsOptional()
  @IsString()
  support_phone?: string;

  @IsOptional()
  @IsString()
  max_services_per_master?: string;

  @IsOptional()
  @IsString()
  default_currency?: string;
}
