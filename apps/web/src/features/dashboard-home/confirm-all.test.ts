import { describe, expect, it, vi } from 'vitest';

import type { Booking, BookingStatus } from '@/features/bookings/types';
import { canRevertConfirmAll, confirmAll } from './complete-all';

const request = (id: string, status: BookingStatus) => ({ id, status }) as Booking;

describe('confirmAll', () => {
  it('подтверждает всю очередь по одному запросу', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    await confirmAll([request('a', 'pending'), request('b', 'pending')], update);

    expect(update.mock.calls).toEqual([
      ['a', 'confirmed'],
      ['b', 'confirmed'],
    ]);
  });

  it('снимает прежние статусы до первого запроса — возврат вернёт своё', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const before = await confirmAll([request('a', 'pending'), request('b', 'expired')], update);

    expect(before).toEqual([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'expired' },
    ]);
  });

  it('пустая очередь не зовёт сервер', async () => {
    const update = vi.fn();
    expect(await confirmAll([], update)).toEqual([]);
    expect(update).not.toHaveBeenCalled();
  });

  it('возврата у массового подтверждения нет: сервер не пускает назад', () => {
    /* Из «подтверждена» дороги в «ждёт ответа» не существует — значит
       предлагать отмену после нельзя, и спрашивать надо до действия. */
    expect(canRevertConfirmAll([{ id: 'a', status: 'pending' }])).toBe(false);
    expect(canRevertConfirmAll([])).toBe(false);
  });
});
