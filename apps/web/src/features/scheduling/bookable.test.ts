import { describe, expect, it } from 'vitest';

import { bookableSlots } from './bookable';
import type { PublishedSlot } from './types';

/**
 * Окна, в которые ещё можно кого-то записать.
 *
 * Шторка «Новая запись» отбирала окна одним условием — свободно ли оно, — и
 * предлагала мастеру восемь дней прошлого, первое из которых выбиралось само.
 * Отказ приходил только с сервера, после заполненной формы. Здесь закреплено,
 * что вопрос «куда можно встать» отвечается двумя условиями, а не одним.
 */

const NOW = new Date('2026-08-24T09:00:00.000Z');

function slot(startsAt: string, status: PublishedSlot['status'] = 'available'): PublishedSlot {
  return {
    id: startsAt,
    organizationMemberId: 'member-1',
    startsAt,
    status,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

describe('bookableSlots — свободного статуса мало', () => {
  it('прошедшее свободное окно не предлагается', () => {
    // Окно, опубликованное на прошлой неделе и никем не занятое, остаётся
    // `available` навсегда — именно оно и вставало первым в списке.
    expect(bookableSlots([slot('2026-08-16T10:00:00.000Z')], NOW)).toEqual([]);
  });

  it('будущее свободное окно предлагается', () => {
    const future = slot('2026-08-25T10:00:00.000Z');

    expect(bookableSlots([future], NOW)).toEqual([future]);
  });

  it('занятое будущее окно не предлагается — там уже кто-то стоит', () => {
    expect(bookableSlots([slot('2026-08-25T10:00:00.000Z', 'booked')], NOW)).toEqual([]);
  });

  it('занятое прошедшее окно не предлагается тем более', () => {
    expect(bookableSlots([slot('2026-08-16T10:00:00.000Z', 'booked')], NOW)).toEqual([]);
  });
});

describe('bookableSlots — граница «сейчас»', () => {
  it('окно ровно в текущую минуту ещё считается доступным', () => {
    // Мастер записывает человека, который стоит перед ней прямо сейчас;
    // отрезать эту минуту значило бы запретить самый частый ручной случай.
    const now = slot('2026-08-24T09:00:00.000Z');

    expect(bookableSlots([now], NOW)).toEqual([now]);
  });

  it('минутой раньше — уже нет', () => {
    expect(bookableSlots([slot('2026-08-24T08:59:00.000Z')], NOW)).toEqual([]);
  });
});

describe('bookableSlots — список целиком', () => {
  it('из смешанного списка остаются только будущие свободные, в исходном порядке', () => {
    const past = slot('2026-08-16T10:00:00.000Z');
    const busy = slot('2026-08-25T11:00:00.000Z', 'booked');
    const first = slot('2026-08-25T10:00:00.000Z');
    const second = slot('2026-08-26T10:00:00.000Z');

    expect(bookableSlots([past, first, busy, second], NOW)).toEqual([first, second]);
  });

  it('пустой список остаётся пустым', () => {
    expect(bookableSlots([], NOW)).toEqual([]);
  });

  it('исходный массив не меняется', () => {
    const input = [slot('2026-08-16T10:00:00.000Z'), slot('2026-08-25T10:00:00.000Z')];

    bookableSlots(input, NOW);

    expect(input).toHaveLength(2);
  });

  it('без явного момента берётся текущий — вызов из компонента ничего не передаёт', () => {
    const longAgo = slot('2020-01-01T10:00:00.000Z');
    const farAhead = slot('2099-01-01T10:00:00.000Z');

    expect(bookableSlots([longAgo, farAhead])).toEqual([farAhead]);
  });
});
