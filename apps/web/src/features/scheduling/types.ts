export type SlotStatus = 'available' | 'booked';

export interface PublishedSlot {
  id: string;
  organizationMemberId: string;
  startsAt: string;
  status: SlotStatus;
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
