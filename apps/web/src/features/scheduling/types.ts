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

/**
 * Заблокированное время — «меня здесь нет» (спецификация §24).
 *
 * Не окно и не визит: в нём нельзя ни записаться, ни открыть окно. Блок может
 * идти сквозь сутки — отпуск на неделю остаётся одной строкой, а колонки
 * календаря рисуют каждая свой кусок.
 */
export interface TimeBlock {
  id: string;
  organizationMemberId: string;
  startsAt: string;
  endsAt: string;
  title: string | null;
  createdAt: string;
}

export interface DaySlots {
  dateKey: string;
  weekdayShort: string;
  dayNumber: number;
  monthShort: string;
  slots: PublishedSlot[];
}
