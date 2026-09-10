import type { Booking } from '@/features/bookings/types';

/** Визит в расписании дня — то, что показывают «Сегодня» и список календаря. */
export interface TimelineEntry {
  id: string;
  /** Момент начала визита, ISO. */
  startsAt: string;
  minutes: number;
  clientName: string;
  serviceName: string;
  /** Цвет метки услуги — он же в календаре и в списке записей. */
  tone: string;
  status: Booking['status'];
  href: string;
}

/** Открытое время между записями — то, куда клиент ещё может встать. */
export interface TimelineGap {
  startsAt: string;
  minutes: number;
}
