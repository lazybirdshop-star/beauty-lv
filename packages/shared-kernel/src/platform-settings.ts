/**
 * Known platform_settings keys (TASKS.md AP-6). A brand-new setting is
 * still just a row — nothing here forces a migration — but the admin UI
 * and the backend DTO both need to agree on which keys are editable
 * through the form, so that list lives here once.
 */
export const PLATFORM_SETTING_KEYS = [
  'site_name',
  'seo_description',
  'support_email',
  'support_phone',
  'max_services_per_master',
  'default_currency',
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];
