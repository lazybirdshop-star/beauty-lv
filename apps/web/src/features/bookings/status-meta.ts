import type { Messages } from '@/lib/i18n/messages';

import type { BookingFilter } from './filter';
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

export function getBookingStatusFilters(t?: Messages): { key: BookingFilter; label: string }[] {
  const b = t?.bookings;
  return [
    { key: 'all', label: b?.filterAll ?? 'Все' },
    { key: 'pending', label: b?.filterNew ?? 'Новые' },
    { key: 'confirmed', label: b?.filterConfirmed ?? 'Подтверждённые' },
    { key: 'completed', label: b?.filterCompleted ?? 'Завершённые' },
    /* Отменённые одной вкладкой на оба статуса: кто именно отменил, видно в
       самой карточке, а списку это различие не нужно. В админской версии того
       же списка фильтр был, в мастерской — нет. */
    { key: 'cancelled', label: b?.filterCancelled ?? 'Отменённые' },
  ];
}

/* The frozen Russian `BOOKING_STATUS_META` / `BOOKING_STATUS_FILTERS`
   constants are gone on purpose: they duplicated the localized functions
   above and were guaranteed to drift from them (audit P3). */
