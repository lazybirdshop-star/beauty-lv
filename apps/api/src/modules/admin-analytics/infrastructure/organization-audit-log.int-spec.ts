import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, type TestOrg } from '../../../testing/factories';
import { AuditLogRepository } from './audit-log.repository';

/**
 * Журнал заведения — против живого Postgres.
 *
 * Граница арендатора держится условием в запросе и в счёте: журнал платформы
 * общий, и мок, отдающий заготовленные строки, не доказал бы, что владелица
 * одного салона не видит строк другого.
 */

let repository: AuditLogRepository;
let org: TestOrg;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new AuditLogRepository(testDb());
  org = await createOrg();
});

describe('listForOrganization', () => {
  beforeEach(async () => {
    const other = await createOrg();
    await repository.record({
      actor: { sub: org.userId },
      action: 'client.blocked',
      entityType: 'client',
      entityId: org.memberId,
      organizationId: org.organizationId,
    });
    await repository.record({
      actor: { sub: other.userId },
      action: 'client.deleted',
      entityType: 'client',
      entityId: other.memberId,
      organizationId: other.organizationId,
    });
    await repository.record({
      actor: null,
      action: 'booking.cancelled_by_client',
      entityType: 'booking',
      entityId: org.memberId,
      organizationId: org.organizationId,
    });
  });

  it('только своё заведение, новыми сверху, с именем того, кто действовал', async () => {
    const page = await repository.listForOrganization(org.organizationId, {
      limit: 10,
      offset: 0,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((entry) => entry.action)).toEqual([
      'booking.cancelled_by_client',
      'client.blocked',
    ]);
    expect(page.items[1]!.actorName).toBe('Мастер');
    expect(page.items[0]!.actorName).toBeNull();
  });

  it('страница сдвигается, а счёт остаётся полным', async () => {
    const page = await repository.listForOrganization(org.organizationId, {
      limit: 1,
      offset: 1,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((entry) => entry.action)).toEqual(['client.blocked']);
  });
});
