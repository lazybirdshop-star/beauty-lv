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
  /* Модерация или открытая регистрация — см. registration.ts. */
  'registration_mode',
  /* Язык и часовой пояс по умолчанию — для салона, который их не выбрал. */
  'default_locale',
  'default_timezone',
  /* На сколько дней вперёд клиент может записаться на публичной странице. */
  'booking_window_days',
  /* Имя и адрес в письмах платформы. */
  'mail_sender_name',
  'mail_reply_to',
  /*
   * Два выключателя из «опасной зоны» артборда. Хранятся строками '1' и '0',
   * как и всё в этой таблице; читаются через `isEnabled`, чтобы «выключено»
   * не зависело от того, кто как записал ложь.
   */
  'maintenance_mode',
  'bookings_paused',
] as const;

/**
 * Выключатель включён?
 *
 * Отсутствие значения — это «выключен»: настройка, которой в таблице ещё нет,
 * не должна означать «платформа на обслуживании».
 */
export function isEnabled(value: string | undefined | null): boolean {
  return value === '1' || value === 'true';
}

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];
