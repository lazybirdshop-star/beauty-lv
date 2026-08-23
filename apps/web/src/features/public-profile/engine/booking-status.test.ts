import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';

import { fetchPublicBooking, isAwaitingConfirmation, type PublicBooking } from './booking-status';

/**
 * Характеризационные тесты (шаг M0, BRAND_STYLE_ARCHITECTURE.md §12):
 * фиксируют текущее поведение как есть до переноса в `engine/` на шаге M1.
 * Сеть подменена — `serverApiFetch` мокается, сам клиент не дёргается.
 */

vi.mock('@/lib/server-api', () => ({
  serverApiFetch: vi.fn(),
}));

const serverApiFetchMock = vi.mocked(serverApiFetch);

const BOOKING: PublicBooking = {
  status: 'pending',
  startsAt: '2026-02-10T10:00:00.000+02:00',
  cancellableUntil: null,
  durationMinutes: 90,
  items: [
    { name: 'Маникюр', durationMinutes: 90, priceAmountMinorUnits: 3500, priceCurrency: 'EUR' },
  ],
};

beforeEach(() => {
  serverApiFetchMock.mockReset();
});

describe('fetchPublicBooking', () => {
  it('успешный ответ возвращается как есть', async () => {
    serverApiFetchMock.mockResolvedValue(BOOKING);
    await expect(fetchPublicBooking('anna', 'token-1')).resolves.toEqual(BOOKING);
  });

  it('путь строится по slug и токену; токен URL-кодируется', async () => {
    serverApiFetchMock.mockResolvedValue(BOOKING);
    await fetchPublicBooking('anna', 'tok en/1');
    expect(serverApiFetchMock).toHaveBeenCalledWith(
      '/organizations/anna/public-bookings/tok%20en%2F1',
    );
  });

  it('404 чужого токена — null: снаружи не отличить от удалённой записи', async () => {
    serverApiFetchMock.mockRejectedValue(new ApiError(404, 'Not found'));
    await expect(fetchPublicBooking('anna', 'wrong')).resolves.toBeNull();
  });

  it('любая другая ошибка — тоже null', async () => {
    serverApiFetchMock.mockRejectedValue(new Error('network down'));
    await expect(fetchPublicBooking('anna', 'token-1')).resolves.toBeNull();
  });
});

describe('isAwaitingConfirmation', () => {
  it('только pending ждёт подтверждения мастера', () => {
    expect(isAwaitingConfirmation('pending')).toBe(true);
  });

  it.each<PublicBooking['status']>([
    'confirmed',
    'completed',
    'cancelled_by_client',
    'cancelled_by_master',
    'no_show',
  ])('%s — не pending', (status) => {
    expect(isAwaitingConfirmation(status)).toBe(false);
  });
});
