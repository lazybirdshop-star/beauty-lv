import type { RegistrationMode } from '@amolie/shared-kernel';

export interface PlatformSettingsFormValues {
  registration_mode: RegistrationMode;
  site_name: string;
  seo_description: string;
  support_email: string;
  support_phone: string;
  max_services_per_master: string;
  default_currency: string;
  default_locale: string;
  default_timezone: string;
  booking_window_days: string;
  mail_sender_name: string;
  mail_reply_to: string;
}

/**
 * Два выключателя «опасной зоны».
 *
 * Отдельно от формы: они сохраняются в момент переключения, а не по кнопке
 * внизу. Настройка, которая останавливает запись на всей платформе, не должна
 * ждать, пока человек долистает до «Сохранить», — и наоборот, не должна
 * уезжать вместе с чужими правками, которые он ещё не закончил.
 */
export interface PlatformSwitches {
  maintenance_mode: boolean;
  bookings_paused: boolean;
}

/**
 * Ответ настроек — все ключи необязательные.
 *
 * Кроме полей формы сюда входят выключатели «опасной зоны»: они хранятся в той
 * же таблице ключ-значение, но живут вне формы, потому что сохраняются в
 * момент переключения.
 */
export type PlatformSettingsResponse = Partial<
  Record<keyof PlatformSettingsFormValues | keyof PlatformSwitches, string>
>;
