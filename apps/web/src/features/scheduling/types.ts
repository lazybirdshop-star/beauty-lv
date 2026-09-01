export type SlotStatus = 'available' | 'booked';

export interface PublishedSlot {
  id: string;
  organizationMemberId: string;
  startsAt: string;
  status: SlotStatus;
  /**
   * Окно есть у мастера, но клиенту его не предлагают.
   *
   * Не `boolean`, а время: карточка окна показывает, когда мастер сама его
   * убрала, — и по нему же отличается «скрыла на прошлой неделе» от «скрыла
   * только что и передумала».
   */
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DaySlots {
  dateKey: string;
  weekdayShort: string;
  dayNumber: number;
  monthShort: string;
  slots: PublishedSlot[];
}
