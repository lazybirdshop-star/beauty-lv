import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, type TestOrg } from '../../../testing/factories';
import { FinanceRepository } from './finance.repository';

/**
 * Финансы — против живого Postgres.
 *
 * Сводка собирается пятью параллельными запросами с `filter (where …)`,
 * `date_trunc` и группировкой по номеру столбца. Ни одно из этих мест не
 * проверяется типами: они либо исполняются базой, либо нет — а «нет» здесь
 * означает пустой раздел про деньги.
 *
 * Отдельно проверяется то, ради чего появился период: отрезок обязан
 * применяться **ко всем** числам разом. Раньше график шёл за год, а итоги за
 * всё время, и экран показывал одно над другим, ничего не говоря.
 */

let repository: FinanceRepository;
let org: TestOrg;

const AUGUST = {
  from: new Date('2026-07-31T21:00:00.000Z'),
  to: new Date('2026-08-31T21:00:00.000Z'),
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new FinanceRepository(testDb());
  org = await createOrg();
});

describe('getSummary — запрос исполняется', () => {
  it('пустая организация не роняет сводку', async () => {
    // Первый день работы — самое частое состояние нового кабинета.
    const summary = await repository.getSummary(org.organizationId);

    expect(summary.totalRevenue).toBe(0);
    expect(summary.averageCheck).toBe(0);
    expect(summary.byMonth).toEqual([]);
  });

  it('считает доход по завершённым визитам', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 3500,
    });
    await createBooking(org, {
      startsAt: new Date('2026-08-11T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 4500,
    });

    const summary = await repository.getSummary(org.organizationId);

    expect(summary.totalRevenue).toBe(8000);
    expect(summary.averageCheck).toBe(4000);
  });

  it('незавершённые визиты в доход не идут', async () => {
    /* Подтверждённая запись — ещё не деньги: визит не состоялся. */
    await createBooking(org, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'confirmed',
      priceAmount: 3500,
    });

    expect((await repository.getSummary(org.organizationId)).totalRevenue).toBe(0);
  });
});

describe('getSummary — отрезок применяется ко всем числам', () => {
  beforeEach(async () => {
    await createBooking(org, {
      startsAt: new Date('2026-07-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 10000,
      serviceName: 'Июльская',
    });
    await createBooking(org, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 3000,
      serviceName: 'Августовская',
    });
  });

  it('сумма — только за период', async () => {
    expect((await repository.getSummary(org.organizationId, AUGUST)).totalRevenue).toBe(3000);
  });

  it('разбивка по услугам — тоже за период, а не за всё время', async () => {
    // Ровно это и расходилось: график был за год, а услуги за всю историю.
    const summary = await repository.getSummary(org.organizationId, AUGUST);

    expect(summary.byService.map((row) => row.serviceName)).toEqual(['Августовская']);
  });

  it('график содержит только месяцы периода', async () => {
    const summary = await repository.getSummary(org.organizationId, AUGUST);

    expect(summary.byMonth.map((row) => row.month)).toEqual(['2026-08']);
  });

  it('счётчики отмен — тоже за период', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-07-15T09:00:00.000Z'),
      status: 'cancelled_by_client',
    });

    const summary = await repository.getSummary(org.organizationId, AUGUST);

    expect(summary.cancelledCount).toBe(0);
  });
});

describe('getSummary — сравнение с прошлым периодом', () => {
  it('прошлый период — отрезок той же длины вплотную слева', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-07-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 10000,
    });
    await createBooking(org, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 3000,
    });

    const summary = await repository.getSummary(org.organizationId, AUGUST);

    expect(summary.totalRevenue).toBe(3000);
    expect(summary.previousRevenue).toBe(10000);
  });

  it('без дохода в прошлом периоде — ноль, а не пусто', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 3000,
    });

    expect((await repository.getSummary(org.organizationId, AUGUST)).previousRevenue).toBe(0);
  });

  it('у «всего времени» предыдущего периода нет', async () => {
    /* `null`, а не ноль: ноль мастер прочтёт как «в прошлом было пусто», а
       сравнивать здесь не с чем в принципе. */
    expect((await repository.getSummary(org.organizationId)).previousRevenue).toBeNull();
  });
});

describe('getSummary — чужие деньги', () => {
  it('доход соседней организации не попадает в сводку', async () => {
    const other = await createOrg();
    await createBooking(other, {
      startsAt: new Date('2026-08-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 99999,
    });

    expect((await repository.getSummary(org.organizationId)).totalRevenue).toBe(0);
  });
});
