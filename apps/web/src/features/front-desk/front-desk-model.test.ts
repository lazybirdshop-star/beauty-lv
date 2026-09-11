import { describe, expect, it } from 'vitest';

import type { Booking } from '@/features/bookings/types';

import { frontDeskModel, visitEnd } from './front-desk-model';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');

function visit(id: string, startsAt: string, status: Booking['status'], minutes = 60): Booking {
  return {
    id,
    startsAt,
    status,
    items: minutes ? [{ durationMinutesSnapshot: minutes }] : [],
  } as unknown as Booking;
}

describe('frontDeskModel', () => {
  const model = frontDeskModel(
    [
      visit('later', '2026-09-11T15:00:00.000Z', 'pending'),
      visit('chair', '2026-09-11T11:30:00.000Z', 'confirmed'),
      visit('forgotten', '2026-09-11T09:00:00.000Z', 'confirmed'),
      visit('expired', '2026-09-11T08:00:00.000Z', 'expired'),
      visit('done', '2026-09-11T07:00:00.000Z', 'completed'),
      visit('cancelled', '2026-09-11T13:00:00.000Z', 'cancelled_by_client'),
      visit('absent', '2026-09-11T10:00:00.000Z', 'no_show'),
    ],
    NOW,
  );

  it('идущий визит — в кресле, будущий — дальше', () => {
    expect(model.inChair.map((booking) => booking.id)).toEqual(['chair']);
    expect(model.next.map((booking) => booking.id)).toEqual(['later']);
  });

  it('прошедший без отметки ждёт её, включая истёкший без ответа, раньше — выше', () => {
    expect(model.awaiting.map((booking) => booking.id)).toEqual(['expired', 'forgotten']);
  });

  it('завершённые считаются, отменённые и «не пришёл» в группы не входят', () => {
    expect(model.doneCount).toBe(1);
    const grouped = [...model.inChair, ...model.next, ...model.awaiting].map((b) => b.id);
    expect(grouped).not.toContain('cancelled');
    expect(grouped).not.toContain('absent');
  });

  it('визит без позиций длится полчаса, а не ноль', () => {
    expect(visitEnd(visit('empty', '2026-09-11T11:45:00.000Z', 'confirmed', 0))).toBe(
      Date.parse('2026-09-11T12:15:00.000Z'),
    );
  });
});
