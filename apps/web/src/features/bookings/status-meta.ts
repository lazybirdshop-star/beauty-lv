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
 *
 * Тона — по прототипу «Кабинет 2026» (правка v3): розовый остаётся только за
 * действием, поэтому ждущая ответа запись янтарная, а не розовая. Красный —
 * только неявка, единственный статус, после которого что-то пошло не так.
 * Отмена — тихая: запись просто ушла из дня, и кричать о ней незачем.
 * Заявка без ответа — янтарная, как и ждущая: это то же ожидание, которое
 * истекло, а не отказ.
 */
export function getBookingStatusMeta(t?: Messages): Record<BookingStatus, StatusMeta> {
  const b = t?.bookings;
  return {
    pending: { label: b?.statusNew ?? 'Ждёт ответа', tone: 'warning' },
    confirmed: { label: b?.statusConfirmed ?? 'Подтверждена', tone: 'success' },
    completed: { label: b?.statusCompleted ?? 'Завершена', tone: 'neutral' },
    /* В бейдже — просто «Отменена», как в прототипе «Кабинет 2026»: кто
       отменил, говорит карточка записи, а строке хватает факта. Панель
       платформы различает оба статуса своим фильтром. */
    cancelled_by_client: { label: b?.statusCancelled ?? 'Отменена', tone: 'neutral' },
    cancelled_by_master: { label: b?.statusCancelled ?? 'Отменена', tone: 'neutral' },
    no_show: { label: b?.statusNoShow ?? 'Не пришёл', tone: 'danger' },
    expired: { label: b?.statusExpired ?? 'Без ответа', tone: 'warning' },
  };
}

export function getBookingStatusFilters(t?: Messages): { key: BookingFilter; label: string }[] {
  const b = t?.bookings;
  return [
    { key: 'all', label: b?.filterAll ?? 'Все' },
    { key: 'pending', label: b?.filterNew ?? 'Ждут ответа' },
    { key: 'confirmed', label: b?.filterConfirmed ?? 'Подтверждённые' },
    { key: 'completed', label: b?.filterCompleted ?? 'Завершённые' },
    /* Отменённые одной вкладкой на оба статуса: кто именно отменил, видно в
       самой карточке, а списку это различие не нужно. В админской версии того
       же списка фильтр был, в мастерской — нет. */
    { key: 'cancelled', label: b?.filterCancelled ?? 'Отменённые' },
    { key: 'missed', label: b?.filterMissed ?? 'Не состоялись' },
  ];
}

/* The frozen Russian `BOOKING_STATUS_META` / `BOOKING_STATUS_FILTERS`
   constants are gone on purpose: they duplicated the localized functions
   above and were guaranteed to drift from them (audit P3). */
