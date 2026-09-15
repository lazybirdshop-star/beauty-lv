import { describe, expect, it } from 'vitest';

import { memberDay } from './member-day';

const visit = (memberId: string, startsAt: string, minutes: number[]) => ({
  organizationMemberId: memberId,
  startsAt,
  items: minutes.map((durationMinutesSnapshot) => ({ durationMinutesSnapshot })),
});

const slot = (memberId: string, hiddenAt: string | null = null) => ({
  organizationMemberId: memberId,
  status: 'available' as const,
  hiddenAt,
});

describe('memberDay', () => {
  it('spans from the first visit start to the last visit end', () => {
    const day = memberDay(
      'anna',
      [
        visit('anna', '2026-09-14T14:00:00.000Z', [60, 30]),
        visit('anna', '2026-09-14T08:00:00.000Z', [45]),
        visit('rasa', '2026-09-14T06:00:00.000Z', [60]),
      ],
      [],
    );

    expect(day.busy).toEqual({
      startsAt: '2026-09-14T08:00:00.000Z',
      endsAt: '2026-09-14T15:30:00.000Z',
    });
  });

  it('gives a visit without a duration snapshot half an hour', () => {
    const day = memberDay('anna', [visit('anna', '2026-09-14T09:00:00.000Z', [])], []);

    expect(day.busy?.endsAt).toBe('2026-09-14T09:30:00.000Z');
  });

  it('has no busy span when the person has no visits', () => {
    expect(memberDay('anna', [visit('rasa', '2026-09-14T09:00:00.000Z', [60])], []).busy).toBe(
      null,
    );
  });

  it('counts only the person’s open slots that clients can see', () => {
    const day = memberDay(
      'anna',
      [],
      [slot('anna'), slot('anna'), slot('anna', '2026-09-13T10:00:00.000Z'), slot('rasa')],
    );

    expect(day.openSlots).toBe(2);
  });
});
