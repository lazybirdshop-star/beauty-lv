import type { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import type { BookingsRepository } from '../infrastructure/bookings.repository';
import { BookingExpiryService } from './booking-expiry.service';

/**
 * Проход гасит записи, которых мастер не коснулась. Что именно попадает под
 * гашение, решает `WHERE` в репозитории и проверяет набор против живого
 * Postgres; здесь — то, за что отвечает сам сервис: что он не роняет процесс и
 * не ставит таймер там, где фоновой работы не просили.
 */
function setup(overrides: { enabled?: boolean } = {}) {
  const expirePendingBefore = jest.fn().mockResolvedValue(3);
  const service = new BookingExpiryService(
    { expirePendingBefore } as unknown as BookingsRepository,
    { get: () => overrides.enabled ?? true } as unknown as ConfigService<Env, true>,
  );
  return { service, expirePendingBefore };
}

describe('BookingExpiryService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('гасит записи по времени прохода', async () => {
    const { service, expirePendingBefore } = setup();
    const now = new Date('2026-09-01T12:00:00.000Z');

    await expect(service.sweep(now)).resolves.toBe(3);
    expect(expirePendingBefore).toHaveBeenCalledWith(now);
  });

  it('недоступная база не роняет процесс', async () => {
    /* Проход живёт в таймере: необработанный отказ уронил бы весь API ради
       строки, которую следующий проход через час возьмёт снова. */
    const { service, expirePendingBefore } = setup();
    expirePendingBefore.mockRejectedValue(new Error('connection terminated'));

    await expect(service.sweep()).resolves.toBe(0);
  });

  it('в процессе без фоновой работы не заводит таймера и не ходит в базу', () => {
    const { service, expirePendingBefore } = setup({ enabled: false });

    service.onModuleInit();

    expect(expirePendingBefore).not.toHaveBeenCalled();
    service.onApplicationShutdown();
  });

  it('первый проход идёт сразу, не дожидаясь часа', () => {
    const { service, expirePendingBefore } = setup();

    service.onModuleInit();

    // Машина могла простоять сутки: вчерашние заявки должны погаснуть сразу.
    expect(expirePendingBefore).toHaveBeenCalledTimes(1);
    service.onApplicationShutdown();
  });
});
