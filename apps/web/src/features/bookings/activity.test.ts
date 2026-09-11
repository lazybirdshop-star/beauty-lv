import { describe, expect, it } from 'vitest';

import { unreadCount, unreadSince, type BookingActivity } from './activity';
import type { Booking } from './types';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');

function event(at: string): BookingActivity {
  return { kind: 'booked', at, booking: { id: at } as Booking };
}

describe('unreadCount', () => {
  const events = [
    event('2026-09-11T11:00:00.000Z'),
    event('2026-09-10T20:00:00.000Z'),
    event('2026-09-08T09:00:00.000Z'),
  ];

  it('после последнего взгляда — только то, что пришло позже', () => {
    expect(unreadCount(events, '2026-09-10T21:00:00.000Z', NOW)).toBe(1);
  });

  it('ни разу не смотрели — новыми считаются последние сутки, а не вся лента', () => {
    expect(unreadCount(events, null, NOW)).toBe(2);
  });

  it('испорченное значение в хранилище — как «не смотрели»', () => {
    expect(unreadSince('вчера', NOW)).toBe(NOW - 24 * 60 * 60_000);
  });
});
