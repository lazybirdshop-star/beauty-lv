import { describe, expect, it, vi } from 'vitest';

import type { Booking } from '@/features/bookings/types';

import { canRevertAll, completeAll, revertAll } from './complete-all';

const visit = (id: string, status: Booking['status']) => ({ id, status }) as Booking;

describe('completeAll', () => {
  it('завершает каждый визит отдельным запросом', async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await completeAll([visit('a', 'confirmed'), visit('b', 'no_show')], update);

    expect(update.mock.calls).toEqual([
      ['a', 'completed'],
      ['b', 'completed'],
    ]);
  });

  it('помнит, где был каждый визит до завершения', async () => {
    const before = await completeAll(
      [visit('a', 'confirmed'), visit('b', 'no_show'), visit('c', 'pending')],
      vi.fn().mockResolvedValue(undefined),
    );

    expect(before).toEqual([
      { id: 'a', status: 'confirmed' },
      { id: 'b', status: 'no_show' },
      { id: 'c', status: 'pending' },
    ]);
  });
});

describe('revertAll', () => {
  it('возвращает каждому свой статус, а не общий «подтверждён»', async () => {
    // Неявка, возвращённая в `confirmed`, стала бы подтверждённым визитом,
    // которого не было, — возврат обязан быть точным.
    const update = vi.fn().mockResolvedValue(undefined);

    await revertAll(
      [
        { id: 'a', status: 'confirmed' },
        { id: 'b', status: 'no_show' },
      ],
      update,
    );

    expect(update.mock.calls).toEqual([
      ['a', 'confirmed'],
      ['b', 'no_show'],
    ]);
  });
});

describe('canRevertAll', () => {
  it('отменить можно, когда все были подтверждены', () => {
    expect(
      canRevertAll([
        { id: 'a', status: 'confirmed' },
        { id: 'b', status: 'confirmed' },
      ]),
    ).toBe(true);
  });

  it('нельзя, если в пачке был визит без ответа — ему дороги назад нет', () => {
    // Вернуть половину пачки хуже, чем не предложить: мастер решила бы, что
    // вернулось всё.
    expect(
      canRevertAll([
        { id: 'a', status: 'confirmed' },
        { id: 'b', status: 'expired' },
      ]),
    ).toBe(false);
    expect(canRevertAll([{ id: 'c', status: 'pending' }])).toBe(false);
  });

  it('пустая пачка отмены не предлагает', () => {
    expect(canRevertAll([])).toBe(false);
  });
});
