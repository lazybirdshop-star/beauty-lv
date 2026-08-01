export type Locale = 'ru' | 'lv' | 'en';

export interface AccountProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  locale: Locale;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  role: string;
}

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  locale: Locale;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
}
