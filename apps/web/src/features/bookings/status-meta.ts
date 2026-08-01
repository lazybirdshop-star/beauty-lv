import type { BookingStatus } from './types';

interface StatusMeta {
  label: string;
  tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

export const BOOKING_STATUS_META: Record<BookingStatus, StatusMeta> = {
  pending: { label: 'Новая', tone: 'accent' },
  confirmed: { label: 'Подтверждена', tone: 'success' },
  completed: { label: 'Завершена', tone: 'neutral' },
  cancelled_by_client: { label: 'Отменена клиентом', tone: 'danger' },
  cancelled_by_master: { label: 'Отменена', tone: 'danger' },
  no_show: { label: 'Не пришёл', tone: 'warning' },
};

export const BOOKING_STATUS_FILTERS: { key: 'all' | BookingStatus; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'Новые' },
  { key: 'confirmed', label: 'Подтверждённые' },
  { key: 'completed', label: 'Завершённые' },
];
