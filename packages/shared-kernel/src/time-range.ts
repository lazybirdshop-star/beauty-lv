/**
 * A closed-open UTC time interval, used for working hours and bookings
 * (see DATABASE.md §3.10, the exclusion-constraint discussion).
 */
export interface TimeRange {
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export function timeRange(startsAt: Date, endsAt: Date): TimeRange {
  if (endsAt <= startsAt) {
    throw new Error('endsAt must be after startsAt');
  }
  return { startsAt, endsAt };
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function durationMinutes(range: TimeRange): number {
  return Math.round((range.endsAt.getTime() - range.startsAt.getTime()) / 60_000);
}
