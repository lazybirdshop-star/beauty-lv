export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_master'
  | 'no_show'
  /** Час визита прошёл, а мастер так и не ответила — гасит фоновый проход. */
  | 'expired';

export interface BookingItem {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceNameSnapshot: string;
  durationMinutesSnapshot: number;
  priceAmountSnapshot: number;
  priceCurrencySnapshot: string;
}

export interface Booking {
  id: string;
  organizationId: string;
  organizationMemberId: string;
  publishedSlotId: string;
  clientUserId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestInstagram: string | null;
  status: BookingStatus;
  cancellationReason: string | null;
  source: 'public_page' | 'admin_manual' | 'marketplace';
  notes: string | null;
  startsAt: string;
  items: BookingItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Правка записи. Каждое поле необязательно, `undefined` значит «не трогай».
 *
 * Времени визита здесь нет: перенос — операция расписания, а не формы записи.
 */
export interface UpdateBookingInput {
  /** Весь новый состав, а не добавка: список заменяется целиком. */
  serviceIds?: string[];
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
}

export interface CreateBookingInput {
  /** One of the two: an open window, or a moment the master names herself. */
  publishedSlotId?: string;
  startsAt?: string;
  /** A visit may combine services; the window it blocks is as long as all of them. */
  serviceIds: string[];
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
}
