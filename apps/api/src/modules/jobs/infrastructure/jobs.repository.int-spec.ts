import { sql } from 'drizzle-orm';

import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { JobsRepository } from './jobs.repository';

/**
 * Очередь — против живого Postgres, и по правилу из `testing/database.ts`:
 * `claim` собран шаблоном `sql`, потому что `UPDATE ... FROM (SELECT ... FOR
 * UPDATE SKIP LOCKED)` построителем не выражается. Мок в таком запросе
 * проверяет только то, что мы вызвали метод.
 *
 * Проверяется главное свойство очереди: **одна задача достаётся одному**.
 * Ошибка здесь — это второе письмо клиенту, и увидеть её можно только там,
 * где есть настоящие блокировки строк.
 */

let repository: JobsRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new JobsRepository(testDb());
});

describe('claim — выборка задач', () => {
  it('берёт только те, до которых дошло время', async () => {
    await repository.enqueue({ kind: 'mail.now', runAt: new Date(Date.now() - 1000) });
    await repository.enqueue({ kind: 'mail.later', runAt: new Date(Date.now() + 60_000) });

    const claimed = await repository.claim(10);

    expect(claimed.map((job) => job.kind)).toEqual(['mail.now']);
  });

  it('взятая задача не достаётся второму', async () => {
    /* Ради этого очередь и живёт в базе: `FOR UPDATE SKIP LOCKED` плюс смена
       статуса одним оператором. Два последовательных вызова здесь играют роль
       двух машин — если бы статус менялся отдельным запросом, вторая успела
       бы взять ту же строку. */
    await repository.enqueue({ kind: 'mail.now' });

    const first = await repository.claim(10);
    const second = await repository.claim(10);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('считает попытку при каждом взятии', async () => {
    await repository.enqueue({ kind: 'mail.now' });

    const [job] = await repository.claim(10);

    expect(job!.attempts).toBe(1);
    expect(job!.status).toBe('running');
  });

  it('отдаёт не больше запрошенного и начиная с самых давних', async () => {
    const base = Date.now() - 60_000;
    await repository.enqueue({ kind: 'third', runAt: new Date(base + 2000) });
    await repository.enqueue({ kind: 'first', runAt: new Date(base) });
    await repository.enqueue({ kind: 'second', runAt: new Date(base + 1000) });

    const claimed = await repository.claim(2);

    expect(claimed.map((job) => job.kind)).toEqual(['first', 'second']);
  });
});

describe('enqueue — постановка в очередь', () => {
  it('не заводит вторую задачу с тем же ключом', async () => {
    /* Правка записи и два одновременных запроса зовут это место столько раз,
       сколько случится, а напоминание о визите должно остаться одно. */
    const first = await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' });
    const second = await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('выполненная задача не мешает завести такую же снова', async () => {
    /* Уникальность частичная — только среди живых. Иначе вчерашнее
       напоминание тому же клиенту запретило бы сегодняшнее навсегда. */
    await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' });
    const [job] = await repository.claim(10);
    await repository.complete(job!.id);

    expect(
      await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' }),
    ).not.toBeNull();
  });

  it('задачи без ключа друг другу не мешают', async () => {
    expect(await repository.enqueue({ kind: 'mail' })).not.toBeNull();
    expect(await repository.enqueue({ kind: 'mail' })).not.toBeNull();
  });
});

describe('fail — что происходит с упавшей задачей', () => {
  it('возвращает в очередь с отсрочкой, пока попытки не исчерпаны', async () => {
    await repository.enqueue({ kind: 'mail.now' });
    const [job] = await repository.claim(10);

    await repository.fail(job!, 'provider down');

    // Отсрочка в будущем, поэтому сейчас задача не берётся, но она жива.
    expect(await repository.claim(10)).toHaveLength(0);
    expect(await repository.countByStatus()).toEqual({ pending: 1 });
  });

  it('исчерпав попытки, уходит в отказ и больше не берётся', async () => {
    await repository.enqueue({ kind: 'mail.now', maxAttempts: 1 });
    const [job] = await repository.claim(10);

    await repository.fail(job!, 'provider down');

    expect(await repository.countByStatus()).toEqual({ failed: 1 });
    // Строка остаётся: письмо, которое так и не ушло, обязано оставить след.
    expect(await repository.claim(10)).toHaveLength(0);
  });
});

describe('reclaimStuck — задача, брошенная умершей машиной', () => {
  it('возвращает в очередь взятое слишком давно', async () => {
    await repository.enqueue({ kind: 'mail.now' });
    const [job] = await repository.claim(10);
    // Час назад — заведомо больше любого нашего обработчика.
    await testDb().execute(
      sql`update jobs set started_at = now() - interval '1 hour' where id = ${job!.id}`,
    );

    expect(await repository.reclaimStuck()).toBe(1);
    expect(await repository.claim(10)).toHaveLength(1);
  });

  it('только что взятую не трогает', async () => {
    await repository.enqueue({ kind: 'mail.now' });
    await repository.claim(10);

    expect(await repository.reclaimStuck()).toBe(0);
  });
});

describe('cancelByDedupeKey — повод отпал', () => {
  it('убирает ждущую задачу', async () => {
    /* Визит отменили — напоминание слать нельзя, и дешевле убрать задачу, чем
       учить обработчик заново проверять, жив ли повод. */
    await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' });

    expect(await repository.cancelByDedupeKey('booking:1')).toBe(1);
    expect(await repository.claim(10)).toHaveLength(0);
  });

  it('уже взятую в работу не трогает', async () => {
    await repository.enqueue({ kind: 'booking.reminder', dedupeKey: 'booking:1' });
    await repository.claim(10);

    expect(await repository.cancelByDedupeKey('booking:1')).toBe(0);
  });
});
