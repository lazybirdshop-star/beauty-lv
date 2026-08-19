import { describe, expect, it } from 'vitest';

import { SEARCH_THRESHOLD, searchBookings } from './search';
import type { Booking, BookingItem } from './types';

/**
 * Поиск по записям — то, чем мастер отвечает на «а что там было у Анны».
 *
 * Свёрнутая группа прошедших делает этот вопрос без поиска неразрешимым, так
 * что здесь проверяется не удобство, а достижимость: находится ли человек,
 * которого мастер помнит по имени, по телефону или по услуге.
 */

function item(serviceNameSnapshot: string): BookingItem {
  return {
    id: `item-${serviceNameSnapshot}`,
    bookingId: 'b',
    serviceId: 'svc',
    serviceNameSnapshot,
    durationMinutesSnapshot: 60,
    priceAmountSnapshot: 3500,
    priceCurrencySnapshot: 'EUR',
  };
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: 'slot',
    clientUserId: null,
    guestName: 'Анна',
    guestPhone: '+37120000111',
    guestEmail: null,
    guestInstagram: null,
    status: 'confirmed',
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt: '2026-08-20T07:00:00.000Z',
    items: [item('Маникюр')],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const anna = booking({ id: 'anna', guestName: 'Анна', guestPhone: '+371 20 000 111' });
const boris = booking({
  id: 'boris',
  guestName: 'Борис',
  guestPhone: '+37129999888',
  items: [item('Стрижка')],
});
const all = [anna, boris];

function ids(result: Booking[]) {
  return result.map((entry) => entry.id);
}

describe('searchBookings', () => {
  it('пустой запрос ничего не отсекает', () => {
    expect(searchBookings(all, '')).toBe(all);
  });

  it('запрос из одних пробелов — тоже не фильтр', () => {
    expect(searchBookings(all, '   ')).toBe(all);
  });

  it('находит по имени', () => {
    expect(ids(searchBookings(all, 'Анна'))).toEqual(['anna']);
  });

  it('не спрашивает про регистр', () => {
    expect(ids(searchBookings(all, 'аННа'))).toEqual(['anna']);
  });

  it('находит по куску имени', () => {
    expect(ids(searchBookings(all, 'бор'))).toEqual(['boris']);
  });

  it('находит по названию услуги', () => {
    expect(ids(searchBookings(all, 'стрижка'))).toEqual(['boris']);
  });

  it('ищет по всем услугам записи, а не только по первой', () => {
    const combo = booking({ id: 'combo', items: [item('Маникюр'), item('Педикюр')] });

    expect(ids(searchBookings([combo], 'педикюр'))).toEqual(['combo']);
  });

  it('телефон ищет по одним цифрам — пробелы в номере не мешают', () => {
    // Запись хранит то, что набрал гость: «+371 20 000 111» и «+37120000111»
    // это один человек, и мастер, набирая номер, разделители не повторяет.
    expect(ids(searchBookings(all, '+37120000111'))).toEqual(['anna']);
    expect(ids(searchBookings(all, '20000111'))).toEqual(['anna']);
  });

  it('находит по началу номера', () => {
    expect(ids(searchBookings(all, '+371 29'))).toEqual(['boris']);
  });

  it('запрос без цифр по телефону не ищет', () => {
    // Иначе «+» или «-» в запросе совпали бы с любым номером сразу.
    expect(searchBookings(all, '+')).toHaveLength(0);
  });

  it('ничего не находит — возвращает пусто, а не всё', () => {
    expect(searchBookings(all, 'Виктория')).toEqual([]);
  });

  it('переживает запись без имени и без телефона', () => {
    // Публичная запись может прийти почти пустой; поиск не имеет права упасть.
    const anonymous = booking({ id: 'anon', guestName: null, guestPhone: null, items: [] });

    expect(searchBookings([anonymous], 'анна')).toEqual([]);
    expect(searchBookings([anonymous], '371')).toEqual([]);
  });

  it('не трогает исходный список', () => {
    const input = [...all];
    searchBookings(input, 'анна');

    expect(ids(input)).toEqual(['anna', 'boris']);
  });
});

describe('SEARCH_THRESHOLD', () => {
  it('поле поиска появляется только когда список перестал умещаться', () => {
    // Ниже этого числа всё видно глазами, и поле было бы мебелью.
    expect(SEARCH_THRESHOLD).toBe(8);
  });
});
