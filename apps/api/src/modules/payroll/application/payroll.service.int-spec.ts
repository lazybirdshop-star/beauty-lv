import { organizationMembers } from '../../../shared/database/schema/organization-members';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, type TestOrg } from '../../../testing/factories';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { PayrollRepository } from '../infrastructure/payroll.repository';
import { PayrollService } from './payroll.service';

/**
 * Ведомость — против живого Postgres.
 *
 * Деньги здесь держатся на вещах, которые мок не выполняет: дата визита в
 * поясе заведения (`at time zone` в запросе), статус в самом `WHERE` у шага
 * ведомости и замена черновика в транзакции. Проверяется не «вызвали ли метод»,
 * а то, что утверждённые деньги не меняются под рукой.
 */

let service: PayrollService;
let org: TestOrg;

const actor = () => ({ sub: org.userId });
const MAY = ['2036-05-01', '2036-05-31'] as const;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  service = new PayrollService(new PayrollRepository(testDb()), new AuditLogRepository(testDb()));
  org = await createOrg();
});

async function percent(bps: number) {
  await service.setCompensation(org.organizationId, actor(), {
    organizationMemberId: org.memberId,
    type: 'percent',
    percentBps: bps,
    effectiveFrom: '2036-05-01',
  });
}

describe('calculate', () => {
  it('процент от завершённых визитов периода — по дате визита в поясе заведения', async () => {
    await percent(4000);
    await createBooking(org, {
      startsAt: new Date('2036-05-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 10000,
    });
    // 22:30 UTC 31 мая — это 01:30 первого июня в Риге: визит июньский.
    await createBooking(org, {
      startsAt: new Date('2036-05-31T22:30:00.000Z'),
      status: 'completed',
      priceAmount: 50000,
    });
    await createBooking(org, {
      startsAt: new Date('2036-05-12T09:00:00.000Z'),
      status: 'confirmed',
      priceAmount: 70000,
    });

    const { payouts } = await service.calculate(org.organizationId, actor(), ...MAY);

    expect(payouts).toMatchObject([
      {
        revenueAmount: 10000,
        bookingsCount: 1,
        masterAmount: 4000,
        salonAmount: 6000,
        status: 'draft',
      },
    ]);
  });

  it('пересчёт заменяет черновик, а утверждённую ведомость не трогает', async () => {
    await percent(5000);
    await createBooking(org, {
      startsAt: new Date('2036-05-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 10000,
    });
    const first = await service.calculate(org.organizationId, actor(), ...MAY);
    await service.approve(org.organizationId, actor(), first.payouts[0]!.id);

    await createBooking(org, {
      startsAt: new Date('2036-05-11T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 20000,
    });
    const second = await service.calculate(org.organizationId, actor(), ...MAY);

    expect(second.lockedCount).toBe(1);
    expect(second.payouts).toMatchObject([{ revenueAmount: 10000, status: 'approved' }]);
  });

  it('пересчёт черновика не оставляет двух ведомостей на одни дни', async () => {
    await percent(5000);
    await service.calculate(org.organizationId, actor(), '2036-05-01', '2036-05-15');

    const { payouts } = await service.calculate(org.organizationId, actor(), ...MAY);

    expect(payouts.map((payout) => [payout.periodStart, payout.periodEnd])).toEqual([
      ['2036-05-01', '2036-05-31'],
    ]);
  });
});

describe('кто попадает в ведомость', () => {
  it('владелица без условий — нет, мастер без условий — да, с пометкой', async () => {
    const person = await createOrg();
    const [member] = await testDb()
      .insert(organizationMembers)
      .values({ organizationId: org.organizationId, userId: person.userId, role: 'master' })
      .returning();
    const julia = { ...org, memberId: member!.id };

    await createBooking(org, {
      startsAt: new Date('2036-05-10T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 10000,
    });
    await createBooking(julia, {
      startsAt: new Date('2036-05-11T09:00:00.000Z'),
      status: 'completed',
      priceAmount: 8000,
    });

    const { payouts } = await service.calculate(org.organizationId, actor(), ...MAY);

    expect(payouts).toMatchObject([
      { organizationMemberId: julia.memberId, masterAmount: 0, salonAmount: 8000 },
    ]);
    expect(payouts[0]!.breakdown).toMatchObject([{ type: null }]);
  });
});

describe('шаги ведомости', () => {
  it('выплатить можно только утверждённую', async () => {
    await percent(5000);
    const { payouts } = await service.calculate(org.organizationId, actor(), ...MAY);

    await expect(
      service.markPaid(org.organizationId, actor(), payouts[0]!.id),
    ).rejects.toMatchObject({ code: 'payout_locked' });

    await service.approve(org.organizationId, actor(), payouts[0]!.id);
    await service.markPaid(org.organizationId, actor(), payouts[0]!.id);
    const [paid] = await service.listPayouts(org.organizationId, { includeDrafts: false });
    expect(paid?.status).toBe('paid');
  });

  it('черновик мастер не видит, утверждённую — видит', async () => {
    await percent(5000);
    const { payouts } = await service.calculate(org.organizationId, actor(), ...MAY);
    const own = () =>
      service.listPayouts(org.organizationId, { onlyMemberId: org.memberId, includeDrafts: false });

    expect(await own()).toEqual([]);
    await service.approve(org.organizationId, actor(), payouts[0]!.id);
    expect(await own()).toHaveLength(1);
  });
});

describe('условия', () => {
  it('участнику чужой организации условия не ставятся', async () => {
    const other = await createOrg();

    await expect(
      service.setCompensation(org.organizationId, actor(), {
        organizationMemberId: other.memberId,
        type: 'percent',
        percentBps: 5000,
        effectiveFrom: '2036-05-01',
      }),
    ).rejects.toMatchObject({ code: 'member_not_found' });
  });

  it('аренда без периода — отказ, а не строка, которую потом никто не поймёт', async () => {
    await expect(
      service.setCompensation(org.organizationId, actor(), {
        organizationMemberId: org.memberId,
        type: 'chair_rent',
        rentAmount: 30000,
        effectiveFrom: '2036-05-01',
      }),
    ).rejects.toMatchObject({ code: 'compensation_invalid' });
  });

  it('лишние поля отсекаются по виду расчёта', async () => {
    await service.setCompensation(org.organizationId, actor(), {
      organizationMemberId: org.memberId,
      type: 'chair_rent',
      rentAmount: 30000,
      rentPeriod: 'month',
      percentBps: 4000,
      effectiveFrom: '2036-05-01',
    });

    const [row] = await service.listCompensation(org.organizationId);
    expect(row).toMatchObject({ type: 'chair_rent', percentBps: null, rentAmount: 30000 });
  });
});
