import { ServiceUnavailableException } from '@nestjs/common';

import type { Database } from '../../../shared/database/database.module';
import { HealthController } from './health.controller';

function setup(execute: jest.Mock) {
  return new HealthController({ execute } as unknown as Database);
}

describe('HealthController', () => {
  it('отвечает ok, когда база отвечает', async () => {
    const controller = setup(jest.fn().mockResolvedValue(undefined));

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      timestamp: expect.any(String) as string,
    });
  });

  it('отвечает 503, когда база недоступна', async () => {
    // Ровно то, ради чего проверка существует: машина с недостижимой базой
    // не должна пройти выкатку, притворившись здоровой.
    const controller = setup(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('не выдаёт наружу причину отказа', async () => {
    const controller = setup(
      jest.fn().mockRejectedValue(new Error('password authentication failed for user "postgres"')),
    );

    const error = (await controller
      .check()
      .catch((thrown: unknown) => thrown)) as ServiceUnavailableException;

    // Строка подключения и адрес базы не отдаются по открытой ручке.
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(JSON.stringify(error.getResponse())).not.toContain('postgres');
  });

  it('не ждёт зависшую базу дольше самой проверки', async () => {
    jest.useFakeTimers();
    // Запрос, ушедший в открытое, но зависшее соединение: пул его не прервёт.
    const controller = setup(jest.fn().mockReturnValue(new Promise(() => {})));

    const pending = controller.check();
    const assertion = expect(pending).rejects.toThrow(ServiceUnavailableException);

    await jest.advanceTimersByTimeAsync(2_000);
    await assertion;

    jest.useRealTimers();
  });
});
