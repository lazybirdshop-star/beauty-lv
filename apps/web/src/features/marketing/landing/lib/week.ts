/**
 * Полоса дней над выбором времени.
 *
 * Одна и та же неделя в витрине и в клиентском телефоне: страница показывает
 * один день — вторник 9 сентября, — и полоса обязана вести к нему в обоих
 * местах.
 */
import type { Messages } from '@/lib/i18n/messages';

export type WeekDay = {
  /** Ключ короткой подписи в словаре. */
  day: keyof Messages['marketing'];
  date: number;
  /** Выбранный день. */
  on?: boolean;
  /** Нерабочий день — выбрать нельзя. */
  off?: boolean;
};

export const WEEK: readonly WeekDay[] = [
  { day: 'calMonShort', date: 8 },
  { day: 'calTueShort', date: 9, on: true },
  { day: 'calWedShort', date: 10 },
  { day: 'calThuShort', date: 11 },
  { day: 'calFriShort', date: 12 },
  { day: 'calSatShort', date: 13 },
  { day: 'calSunShort', date: 14, off: true },
];
