import { describe, it, expect } from 'vitest';
import type { Booking } from '@/features/bookings/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { todayModel } from './today-model';

const now = new Date('2026-09-10T09:00:00Z');
function visit(id: string, status: Booking['status'], startsAt = '2026-09-10T10:00:00Z'): Booking {
  return {
    id,
    status,
    startsAt,
    organizationMemberId: 'anna',
    items: [
      { durationMinutesSnapshot: 60, priceAmountSnapshot: 4500, priceCurrencySnapshot: 'EUR' },
    ],
  } as Booking;
}
function slot(member: string, startsAt: string): PublishedSlot {
  return {
    id: member,
    organizationMemberId: member,
    status: 'available',
    startsAt,
    hiddenAt: null,
  } as PublishedSlot;
}
describe('Today operational summary', () => {
  it('never presents a pending or completed visit as the next confirmed client', () => {
    const model = todayModel(
      [visit('pending', 'pending'), visit('done', 'completed'), visit('next', 'confirmed')],
      [],
      now,
      'Europe/Riga',
    );
    expect(model.next?.id).toBe('next');
    expect(model.pending.map((item) => item.id)).toEqual(['pending']);
  });
  it('uses snapshots and excludes cancellations from expected revenue', () => {
    const model = todayModel(
      [visit('yes', 'confirmed'), visit('no', 'cancelled_by_master')],
      [],
      now,
      'Europe/Riga',
    );
    expect(model.revenue).toEqual([['EUR', 4500]]);
  });
  it('does not let one staff appointment close another staff member’s window', () => {
    const model = todayModel(
      [visit('yes', 'confirmed')],
      [slot('anna', '2026-09-10T10:30:00Z'), slot('julia', '2026-09-10T10:30:00Z')],
      now,
      'Europe/Riga',
    );
    expect(model.open.map((item) => item.organizationMemberId)).toEqual(['julia']);
  });
});
