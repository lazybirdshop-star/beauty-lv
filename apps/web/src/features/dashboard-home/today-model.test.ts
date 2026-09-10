import { describe, it, expect } from 'vitest';
import type { Booking } from '@/features/bookings/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { todayModel } from './today-model';

const RIGA = 'Europe/Riga';
const now = new Date('2026-09-10T09:00:00Z');
function visit(
  id: string,
  status: Booking['status'],
  startsAt = '2026-09-10T10:00:00Z',
  member = 'anna',
): Booking {
  return {
    id,
    status,
    startsAt,
    organizationMemberId: member,
    items: [
      { durationMinutesSnapshot: 60, priceAmountSnapshot: 4500, priceCurrencySnapshot: 'EUR' },
    ],
  } as Booking;
}
function slot(member: string, startsAt: string): PublishedSlot {
  return {
    id: `${member}-${startsAt}`,
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
      RIGA,
    );
    expect(model.next?.id).toBe('next');
    expect(model.pending.map((item) => item.id)).toEqual(['pending']);
  });
  it('uses snapshots and excludes cancellations from expected revenue', () => {
    const model = todayModel(
      [visit('yes', 'confirmed'), visit('no', 'cancelled_by_master')],
      [],
      now,
      RIGA,
    );
    expect(model.revenue).toEqual([['EUR', 4500]]);
  });
  it('does not let one staff appointment close another staff member’s window', () => {
    const model = todayModel(
      [visit('yes', 'confirmed')],
      [slot('anna', '2026-09-10T10:30:00Z'), slot('julia', '2026-09-10T10:30:00Z')],
      now,
      RIGA,
    );
    expect(model.open.map((item) => item.organizationMemberId)).toEqual(['julia']);
  });
  it('counts only today’s windows as today’s open time, but the whole week as bookable', () => {
    const model = todayModel([], [slot('anna', '2026-09-12T10:00:00Z')], now, RIGA);
    expect(model.open).toEqual([]);
    expect(model.intervals).toEqual([]);
    expect(model.openAhead).toBe(true);
  });
  it('warns when nothing is bookable ahead', () => {
    expect(todayModel([], [], now, RIGA).openAhead).toBe(false);
  });
  it('suggests opening a long unopened stretch before the next client', () => {
    const model = todayModel([visit('later', 'confirmed', '2026-09-10T12:00:00Z')], [], now, RIGA, {
      memberId: 'anna',
    });
    expect(model.gap).toEqual({ from: '2026-09-10T09:00:00.000Z', to: '2026-09-10T12:00:00.000Z' });
  });
  it('does not suggest opening time that is already open', () => {
    const model = todayModel(
      [visit('later', 'confirmed', '2026-09-10T12:00:00Z')],
      [slot('anna', '2026-09-10T10:00:00Z')],
      now,
      RIGA,
      { memberId: 'anna' },
    );
    expect(model.gap).toBeNull();
  });
  it('does not nag the owner about a colleague’s empty morning', () => {
    const model = todayModel(
      [visit('julia-later', 'confirmed', '2026-09-10T12:00:00Z', 'julia')],
      [],
      now,
      RIGA,
      { memberId: 'anna' },
    );
    expect(model.gap).toBeNull();
  });
  it('lists upcoming client cancellations — that time can be given to someone else', () => {
    const model = todayModel(
      [
        visit('gone', 'cancelled_by_client', '2026-09-10T13:00:00Z'),
        visit('old', 'cancelled_by_client', '2026-09-10T07:00:00Z'),
      ],
      [],
      now,
      RIGA,
    );
    expect(model.cancelled.map((item) => item.id)).toEqual(['gone']);
  });
});
