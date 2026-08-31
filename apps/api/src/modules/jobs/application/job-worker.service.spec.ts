import type { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import type { JobRow } from '../../../shared/database/schema/jobs';
import type { JobsRepository } from '../infrastructure/jobs.repository';
import { JobHandlersRegistry } from './job-handlers.registry';
import { JobWorkerService } from './job-worker.service';

/**
 * Воркер отвечает за одно: что происходит с задачей после того, как она
 * взята. Сама выборка — работа Postgres и проверяется против живой базы
 * (`jobs.repository.int-spec.ts`); здесь двойники, потому что здесь решения,
 * а не запросы.
 */

function jobRow(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'booking.created',
    payload: { bookingId: 'b-1' },
    status: 'running',
    runAt: new Date('2026-09-01T10:00:00.000Z'),
    attempts: 1,
    maxAttempts: 5,
    dedupeKey: null,
    lastError: null,
    startedAt: new Date('2026-09-01T10:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-09-01T09:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

function setup(claimed: JobRow[] = []) {
  const claim = jest.fn().mockResolvedValue(claimed);
  const complete = jest.fn().mockResolvedValue(undefined);
  const fail = jest.fn().mockResolvedValue(undefined);
  const reclaimStuck = jest.fn().mockResolvedValue(0);

  const handlers = new JobHandlersRegistry();
  const worker = new JobWorkerService(
    { claim, complete, fail, reclaimStuck } as unknown as JobsRepository,
    handlers,
    /* Флаг читается в конструкторе; здесь тик зовётся руками, и таймер не
       нужен — но выключенным его ставить нельзя, чтобы не проверять
       выключенный код. */
    { get: () => true } as unknown as ConfigService<Env, true>,
  );

  return { worker, handlers, claim, complete, fail, reclaimStuck };
}

describe('JobWorkerService', () => {
  it('отдаёт задачу её обработчику и закрывает', async () => {
    const { worker, handlers, complete, fail } = setup([jobRow()]);
    const handler = jest.fn().mockResolvedValue(undefined);
    handlers.register('booking.created', handler);

    await worker.tick();

    expect(handler).toHaveBeenCalledWith({ bookingId: 'b-1' });
    expect(complete).toHaveBeenCalledWith(jobRow().id);
    expect(fail).not.toHaveBeenCalled();
  });

  it('упавший обработчик не роняет заход — задача уходит в отказ', async () => {
    /* Одно недоставленное письмо не должно останавливать очередь: за ним в
       той же пачке стоят чужие визиты. */
    const { worker, handlers, fail, complete } = setup([jobRow()]);
    handlers.register('booking.created', jest.fn().mockRejectedValue(new Error('provider down')));

    await expect(worker.tick()).resolves.toBeUndefined();

    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({ id: jobRow().id }),
      'provider down',
    );
    expect(complete).not.toHaveBeenCalled();
  });

  it('задача без обработчика не считается сделанной', async () => {
    /* Так бывает после выката, убравшего вид задачи. Пометить её `done`
       значило бы соврать: работа не выполнена. */
    const { worker, fail, complete } = setup([jobRow({ kind: 'gone.away' })]);

    await worker.tick();

    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'gone.away' }),
      expect.stringContaining('no handler'),
    );
  });

  it('второй тик не наезжает на первый', async () => {
    /* Медленный провайдер иначе множил бы попытки: та же пачка бралась бы
       снова каждые пять секунд, пока первый заход ещё идёт. */
    const { worker, handlers, claim } = setup([jobRow()]);
    let release: (() => void) | undefined;
    handlers.register(
      'booking.created',
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const first = worker.tick();
    await worker.tick();
    expect(claim).toHaveBeenCalledTimes(1);

    release!();
    await first;
  });

  it('сбой базы гасится внутри захода', async () => {
    const { worker, claim } = setup();
    claim.mockRejectedValue(new Error('connection terminated'));

    // Иначе необработанный отказ в таймере уронил бы процесс целиком.
    await expect(worker.tick()).resolves.toBeUndefined();
  });
});

describe('JobHandlersRegistry', () => {
  it('не даёт зарегистрировать второй обработчик на тот же вид', () => {
    /* Второй вытеснил бы первого, и какой уцелеет — зависело бы от порядка
       инициализации модулей: письма удваивались бы или пропадали через раз. */
    const registry = new JobHandlersRegistry();
    registry.register('booking.created', jest.fn());

    expect(() => registry.register('booking.created', jest.fn())).toThrow(/already registered/);
  });
});
