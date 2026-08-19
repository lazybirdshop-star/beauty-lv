import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { groupByAttention } from './group-by-attention';
import type { Booking, BookingStatus } from './types';

/**
 * Раскладка списка записей по тому, что мастеру с ними делать.
 *
 * Это единственное правило приоритета в кабинете: запись, ждущая ответа,
 * обязана стоять выше сегодняшней работы, а всё завершённое и отменённое —
 * уходить в архив, чем бы оно ни было по дате. Проверяется без разметки:
 * решение продуктовое, а не про вёрстку.
 */

const RIGA = 'Europe/Riga';
/** Полдень 20 августа 2026 в Риге (UTC+3) — «сегодня» для всех проверок ниже. */
const NOW = new Date('2026-08-20T09:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function booking(id: string, startsAt: string, status: BookingStatus = 'confirmed'): Booking {
  return {
    id,
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: `slot-${id}`,
    clientUserId: null,
    guestName: `Гость ${id}`,
    guestPhone: '+37120000000',
    guestEmail: null,
    guestInstagram: null,
    status,
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt,
    items: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function keysOf(bookings: Booking[]) {
  return groupByAttention(bookings, ru, RIGA).map((group) => group.key);
}

function group(bookings: Booking[], key: string) {
  return groupByAttention(bookings, ru, RIGA).find((item) => item.key === key);
}

describe('groupByAttention — очередь внимания', () => {
  it('ставит ждущие ответа первой группой, выше сегодняшней работы', () => {
    const waiting = booking('a', '2026-08-25T09:00:00.000Z', 'pending');
    const today = booking('b', '2026-08-20T09:00:00.000Z', 'confirmed');

    // Ответить клиенту важнее, чем посмотреть на день: иначе единственная
    // запись, требующая решения, тонет среди тех, что решения не требуют.
    expect(keysOf([today, waiting])).toEqual(['pending', 'today']);
  });

  it('держит порядок групп: ждут → сегодня → дальше → прошедшие', () => {
    const all = [
      booking('past', '2026-08-10T09:00:00.000Z', 'completed'),
      booking('upcoming', '2026-08-25T09:00:00.000Z', 'confirmed'),
      booking('today', '2026-08-20T09:00:00.000Z', 'confirmed'),
      booking('waiting', '2026-08-21T09:00:00.000Z', 'pending'),
    ];

    expect(keysOf(all)).toEqual(['pending', 'today', 'upcoming', 'past']);
  });

  it('пустые группы не показывает', () => {
    expect(keysOf([booking('a', '2026-08-25T09:00:00.000Z', 'confirmed')])).toEqual(['upcoming']);
  });

  it('на пустом списке не показывает ничего', () => {
    expect(groupByAttention([], ru, RIGA)).toEqual([]);
  });

  it('ждущая ответа остаётся в своей группе, даже когда она уже сегодня', () => {
    const waitingToday = booking('a', '2026-08-20T15:00:00.000Z', 'pending');

    // «Сегодня» — это работа, «ждут подтверждения» — это долг. Запись, до
    // которой мастер ещё не дотронулась, не должна раствориться в дне.
    expect(keysOf([waitingToday])).toEqual(['pending']);
  });

  it.each(['completed', 'no_show', 'cancelled_by_client', 'cancelled_by_master'] as const)(
    'отправляет %s в архив, даже если она завтра',
    (status) => {
      const tomorrow = booking('a', '2026-08-21T09:00:00.000Z', status);

      // От записи уже ничего не требуется, и в «Дальше» её присутствие было бы
      // обещанием визита, которого не будет.
      expect(keysOf([tomorrow])).toEqual(['past']);
    },
  );

  it('вчерашняя подтверждённая запись — тоже архив', () => {
    expect(keysOf([booking('a', '2026-08-19T09:00:00.000Z', 'confirmed')])).toEqual(['past']);
  });

  it('внутри живых групп сортирует по времени, ближайшее первым', () => {
    const late = booking('late', '2026-08-20T17:00:00.000Z');
    const early = booking('early', '2026-08-20T07:00:00.000Z');

    expect(group([late, early], 'today')!.items.map((item) => item.id)).toEqual(['early', 'late']);
  });

  it('архив разворачивает: свежее прошлое сверху', () => {
    const old = booking('old', '2026-07-01T09:00:00.000Z', 'completed');
    const recent = booking('recent', '2026-08-18T09:00:00.000Z', 'completed');

    expect(group([old, recent], 'past')!.items.map((item) => item.id)).toEqual(['recent', 'old']);
  });

  it('подписывает группы словами из словаря, а не своими', () => {
    const groups = groupByAttention(
      [booking('a', '2026-08-20T09:00:00.000Z', 'pending')],
      ru,
      RIGA,
    );

    expect(groups[0]!.title).toBe(ru.bookings.groupPending);
    expect(groups[0]!.hint).toBe(ru.bookings.groupPendingHint);
  });

  it('подсказку даёт только группе ждущих — остальным объяснять нечего', () => {
    const groups = groupByAttention(
      [
        booking('a', '2026-08-20T09:00:00.000Z', 'pending'),
        booking('b', '2026-08-20T10:00:00.000Z', 'confirmed'),
        booking('c', '2026-08-25T10:00:00.000Z', 'confirmed'),
        booking('d', '2026-08-01T10:00:00.000Z', 'completed'),
      ],
      ru,
      RIGA,
    );

    expect(groups.filter((item) => item.hint).map((item) => item.key)).toEqual(['pending']);
  });

  it('не трогает исходный массив', () => {
    const input = [
      booking('late', '2026-08-20T17:00:00.000Z'),
      booking('early', '2026-08-20T07:00:00.000Z'),
    ];

    groupByAttention(input, ru, RIGA);

    // Список приходит из кэша react-query; отсортировать его на месте значило
    // бы менять чужие данные под другими подписчиками.
    expect(input.map((item) => item.id)).toEqual(['late', 'early']);
  });
});

describe('groupByAttention — сутки принадлежат салону', () => {
  it('ночью наступивший день мастера остаётся сегодняшним, а не завтрашним', () => {
    /* Час ночи 20 августа в Риге — это ещё 19 августа 22:00 по UTC. Пока день
       считался в поясе процесса (а на Vercel он живёт в UTC), каждую ночь с
       00:00 до 03:00 весь наступивший день уезжал в «Дальше»: мастер, глядя в
       кабинет в два часа ночи, своей утренней записи не видела. */
    vi.setSystemTime(new Date('2026-08-19T22:00:00.000Z'));
    const morning = booking('morning', '2026-08-20T07:00:00.000Z', 'confirmed');

    expect(groupByAttention([morning], ru, RIGA).map((item) => item.key)).toEqual(['today']);
    expect(groupByAttention([morning], ru, 'UTC').map((item) => item.key)).toEqual(['upcoming']);
  });

  it('без пояса считает день по процессу — поэтому пояс передают всегда', () => {
    // Не поведение, которого хотят, а зафиксированный запасной вариант:
    // подпись сигнатуры позволяет пропустить пояс, и это должно быть видно.
    const morning = booking('morning', '2026-08-20T07:00:00.000Z', 'confirmed');

    expect(groupByAttention([morning], ru).map((item) => item.key)).toEqual(
      groupByAttention([morning], ru, Intl.DateTimeFormat().resolvedOptions().timeZone).map(
        (item) => item.key,
      ),
    );
  });
});
