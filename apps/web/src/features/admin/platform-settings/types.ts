import type { RegistrationMode } from '@amolie/shared-kernel';

export interface PlatformSettingsFormValues {
  registration_mode: RegistrationMode;
  site_name: string;
  seo_description: string;
  support_email: string;
  support_phone: string;
  max_services_per_master: string;
  default_currency: string;
}

export type PlatformSettingsResponse = Partial<Record<keyof PlatformSettingsFormValues, string>>;
