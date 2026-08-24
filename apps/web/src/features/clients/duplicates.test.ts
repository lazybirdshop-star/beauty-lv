import { describe, expect, it } from 'vitest';

import { findDuplicateGroups, preferredClient } from './duplicates';
import type { Client } from './types';

/**
 * Дубли — не догадка о похожих именах, а факт: карточки в одной группе уже
 * показывают одну и ту же историю визитов, потому что записи соединяются с
 * адресной книгой хвостом номера. Мастер видит двух людей там, где продукт
 * давно видит одного.
 */

function client(overrides: Partial<Client> & { id: string; phone: string }): Client {
  return {
    organizationId: 'org',
    fullName: 'Анна',
    email: null,
    instagramHandle: null,
    notes: null,
    flag: null,
    isBlocked: false,
    visitStats: { totalBookings: 0, lastVisitAt: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('findDuplicateGroups', () => {
  it('номер с кодом страны и без — одна группа', () => {
    const groups = findDuplicateGroups([
      client({ id: 'a', phone: '+37120000114' }),
      client({ id: 'b', phone: '20000114' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.clients.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('разные записи одного номера с разделителями — тоже одна', () => {
    const groups = findDuplicateGroups([
      client({ id: 'a', phone: '+371 20 000 114' }),
      client({ id: 'b', phone: '+37120000114' }),
    ]);

    expect(groups).toHaveLength(1);
  });

  it('разные люди не склеиваются', () => {
    const groups = findDuplicateGroups([
      client({ id: 'a', phone: '+37120000114' }),
      client({ id: 'b', phone: '+37120000115' }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it('одинокая карточка группой не считается', () => {
    expect(findDuplicateGroups([client({ id: 'a', phone: '+37120000114' })])).toHaveLength(0);
  });

  it('карточки без номера не склеиваются в одну кучу', () => {
    /* Пустой ключ совпал бы сам с собой у всех, кого мастер завела без
       телефона, — и предложил бы слить незнакомых людей. */
    const groups = findDuplicateGroups([
      client({ id: 'a', phone: '' }),
      client({ id: 'b', phone: '' }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it('троих одного человека собирает в одну группу', () => {
    const groups = findDuplicateGroups([
      client({ id: 'a', phone: '+37120000114' }),
      client({ id: 'b', phone: '20000114' }),
      client({ id: 'c', phone: '0037120000114' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.clients).toHaveLength(3);
  });
});

describe('preferredClient — какую карточку оставить', () => {
  it('ту, где больше заполнено', () => {
    const sparse = client({ id: 'a', phone: '+37120000114' });
    const rich = client({ id: 'b', phone: '20000114', notes: 'аллергия', flag: 'attention' });

    expect(preferredClient([sparse, rich]).id).toBe('b');
  });

  it('при равной полноте — заведённую раньше', () => {
    /* Более старая, скорее всего, и есть «настоящая»: вторая появилась из
       записи, где гость представился иначе. */
    const older = client({ id: 'a', phone: '+37120000114', createdAt: '2025-05-01T00:00:00.000Z' });
    const newer = client({ id: 'b', phone: '20000114', createdAt: '2026-05-01T00:00:00.000Z' });

    expect(preferredClient([newer, older]).id).toBe('a');
  });

  it('исходный массив не переставляется', () => {
    // Список рисуется в своём порядке; выбор главной не должен его трогать.
    const group = [
      client({ id: 'a', phone: '+37120000114' }),
      client({ id: 'b', phone: '20000114', notes: 'аллергия' }),
    ];
    preferredClient(group);

    expect(group.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
