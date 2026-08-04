import type { Messages } from '@/lib/i18n/messages';

import type { BookingStatus } from './types';

interface StatusMeta {
  label: string;
  tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

/**
 * Functions of the dictionary rather than frozen constants: a status label is
 * chrome, and chrome follows the master's language like everything else.
 */
export function getBookingStatusMeta(t?: Messages): Record<BookingStatus, StatusMeta> {
  const b = t?.bookings;
  return {
    pending: { label: b?.statusNew ?? 'Новая', tone: 'accent' },
    confirmed: { label: b?.statusConfirmed ?? 'Подтверждена', tone: 'success' },
    completed: { label: b?.statusCompleted ?? 'Завершена', tone: 'neutral' },
    cancelled_by_client: {
      label: b?.statusCancelledByClient ?? 'Отменена клиентом',
      tone: 'danger',
    },
    cancelled_by_master: { label: b?.statusCancelled ?? 'Отменена', tone: 'danger' },
    no_show: { label: b?.statusNoShow ?? 'Не пришёл', tone: 'warning' },
  };
}

export function getBookingStatusFilters(
  t?: Messages,
): { key: 'all' | BookingStatus; label: string }[] {
  const b = t?.bookings;
  return [
    { key: 'all', label: b?.filterAll ?? 'Все' },
    { key: 'pending', label: b?.filterNew ?? 'Новые' },
    { key: 'confirmed', label: b?.filterConfirmed ?? 'Подтверждённые' },
    { key: 'completed', label: b?.filterCompleted ?? 'Завершённые' },
  ];
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
