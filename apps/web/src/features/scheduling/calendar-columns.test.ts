import { describe, expect, it } from 'vitest';

import type { Booking } from '@/features/bookings/types';
import type { TeamMember } from '@/features/team/types';

import {
  bookingEntries,
  placeEntries,
  resolveView,
  restoreVisible,
  teamColumns,
  toggleVisible,
  weekColumns,
} from './calendar-columns';
import type { PublishedSlot } from './types';
import type { WeekDay } from './week';

const ZONE = 'Europe/Riga';
const ANNA = 'member-anna';
const JULIA = 'member-julia';
const MAX = 'member-max';

function member(id: string, name: string, status: TeamMember['status'] = 'active'): TeamMember {
  return { id, name, status, avatarUrl: null } as TeamMember;
}

function slot(owner: string, startsAt: string): PublishedSlot {
  return {
    id: `${owner}-${startsAt}`,
    organizationMemberId: owner,
    startsAt,
    status: 'available',
    hiddenAt: null,
  } as PublishedSlot;
}

function booking(owner: string, startsAt: string, status: Booking['status'] = 'confirmed') {
  return {
    id: `${owner}-${startsAt}`,
    organizationMemberId: owner,
    startsAt,
    status,
    guestName: 'Maria',
    items: [
      {
        serviceId: 'svc',
        serviceNameSnapshot: 'Manicure',
        durationMinutesSnapshot: 60,
        priceAmountSnapshot: 4500,
        priceCurrencySnapshot: 'EUR',
      },
    ],
  } as Booking;
}

function day(slots: PublishedSlot[], dateKey = '2026-09-10'): WeekDay {
  return {
    dateKey,
    weekdayShort: 'чт',
    dayNumber: 10,
    isToday: true,
    slots,
  } as WeekDay;
}

describe('resolveView', () => {
  const salon = { teamAvailable: true, narrow: false };
  const solo = { teamAvailable: false, narrow: false };

  it('администратор салона по умолчанию попадает в командный день', () => {
    expect(resolveView(null, undefined, salon)).toBe('team');
  });

  it('соло-мастеру по умолчанию — неделя, и «команды» у неё нет даже по ссылке', () => {
    expect(resolveView(null, undefined, solo)).toBe('week');
    expect(resolveView('team', undefined, solo)).toBe('week');
  });

  it('адрес важнее запомненного, запомненное важнее умолчания', () => {
    expect(resolveView('list', 'day', salon)).toBe('list');
    expect(resolveView(null, 'day', salon)).toBe('day');
    expect(resolveView('nonsense', 'week', salon)).toBe('week');
  });

  it('на телефоне сетка — всегда день, а список остаётся списком', () => {
    expect(resolveView('team', undefined, { ...salon, narrow: true })).toBe('day');
    expect(resolveView('week', undefined, { ...solo, narrow: true })).toBe('day');
    expect(resolveView('list', undefined, { ...salon, narrow: true })).toBe('list');
  });
});

describe('placeEntries', () => {
  /* 07:00 UTC — 10:00 в Риге. */
  const entries = bookingEntries(
    [
      booking(ANNA, '2026-09-10T07:00:00.000Z'),
      booking(JULIA, '2026-09-10T07:00:00.000Z'),
      booking(ANNA, '2026-09-11T07:00:00.000Z'),
      booking(ANNA, '2026-09-10T09:00:00.000Z', 'cancelled_by_client'),
    ],
    ZONE,
    'Гость',
  );

  it('отменённое время в сетку не попадает', () => {
    expect(entries).toHaveLength(3);
  });

  it('командный день раскладывает визиты по людям и только за показанный день', () => {
    const placed = placeEntries(entries, 'team', { dateKey: '2026-09-10', personId: null });
    expect(placed.map((entry) => entry.columnKey).sort()).toEqual([ANNA, JULIA]);
  });

  it('неделя показывает время одного человека по дням, а не наложенные чужие дни', () => {
    const placed = placeEntries(entries, 'week', { dateKey: '2026-09-10', personId: ANNA });
    expect(placed.map((entry) => entry.columnKey)).toEqual(['2026-09-10', '2026-09-11']);
  });

  it('минуты визита считаются в поясе заведения', () => {
    expect(entries[0]!.at).toBe(600);
    expect(entries[0]!.minutes).toBe(60);
  });
});

describe('teamColumns', () => {
  const describeCount = (count: number) => `${count}`;

  it('работающий виден и с пустым днём, приглашённый — нет', () => {
    const columns = teamColumns(
      day([]),
      [member(ANNA, 'Anna'), member(JULIA, 'Julia', 'invited')],
      null,
      [],
      describeCount,
    );
    expect(columns.map((column) => column.memberId)).toEqual([ANNA]);
  });

  it('отстранённая остаётся, пока за ней в этот день стоит время', () => {
    const entries = bookingEntries([booking(MAX, '2026-09-10T07:00:00.000Z')], ZONE, 'Гость');
    const columns = teamColumns(
      day([]),
      [member(ANNA, 'Anna'), member(MAX, 'Max', 'disabled')],
      null,
      entries,
      describeCount,
    );
    expect(columns.map((column) => column.memberId)).toEqual([ANNA, MAX]);
    expect(columns[1]!.person?.meta).toBe('1');
  });

  it('у каждой колонки только окна её человека', () => {
    const columns = teamColumns(
      day([slot(ANNA, '2026-09-10T07:00:00.000Z'), slot(JULIA, '2026-09-10T08:00:00.000Z')]),
      [member(ANNA, 'Anna Smith'), member(JULIA, 'Julia')],
      null,
      [],
      describeCount,
    );
    expect(columns[0]!.slots.map((s) => s.organizationMemberId)).toEqual([ANNA]);
    expect(columns[0]!.person?.name).toBe('Anna Smith');
  });

  it('фильтр оставляет только выбранных', () => {
    const columns = teamColumns(
      day([]),
      [member(ANNA, 'Anna'), member(JULIA, 'Julia')],
      new Set([JULIA]),
      [],
      describeCount,
    );
    expect(columns.map((column) => column.memberId)).toEqual([JULIA]);
  });
});

describe('weekColumns', () => {
  it('в колонках дня — окна только того, чьё время смотрят', () => {
    const [column] = weekColumns(
      [day([slot(ANNA, '2026-09-10T07:00:00.000Z'), slot(JULIA, '2026-09-10T07:00:00.000Z')])],
      JULIA,
    );
    expect(column!.slots).toHaveLength(1);
    expect(column!.memberId).toBe(JULIA);
  });
});

describe('toggleVisible', () => {
  const all = [ANNA, JULIA, MAX];

  it('из «всех» нажатие оставляет одного', () => {
    expect(toggleVisible(null, JULIA, all)).toEqual(new Set([JULIA]));
  });

  it('добавляет и убирает, а последний снятый возвращает всех', () => {
    const two = toggleVisible(new Set([JULIA]), ANNA, all);
    expect(two).toEqual(new Set([JULIA, ANNA]));
    expect(toggleVisible(new Set([JULIA]), JULIA, all)).toBeNull();
  });

  it('полный набор называется «все»', () => {
    expect(toggleVisible(new Set([ANNA, JULIA]), MAX, all)).toBeNull();
  });
});

describe('restoreVisible', () => {
  it('ушедшие из команды отбрасываются, а набор из одних ушедших — это «все»', () => {
    expect(restoreVisible(['gone'], [ANNA, JULIA])).toBeNull();
    expect(restoreVisible([ANNA, 'gone'], [ANNA, JULIA])).toEqual(new Set([ANNA]));
    expect(restoreVisible(undefined, [ANNA])).toBeNull();
  });
});
