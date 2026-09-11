import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, type TestOrg } from '../../../testing/factories';
import { PushRecipientsRepository } from './push-recipients.repository';

/**
 * Кто узнаёт о событии записи — против живого Postgres.
 *
 * Отбор держится условиями в запросе: роль, статус участника, статус
 * аккаунта и граница организации. Мок отдал бы заготовленных людей и
 * подтвердил бы push отстранённому администратору или стойке соседнего салона.
 */

let repository: PushRecipientsRepository;
let org: TestOrg;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new PushRecipientsRepository(testDb());
  org = await createOrg();
});

async function join(role: 'admin' | 'master', displayName: string): Promise<string> {
  const person = await createOrg();
  const [member] = await testDb()
    .insert(organizationMembers)
    .values({ organizationId: org.organizationId, userId: person.userId, role, displayName })
    .returning();
  return member!.id;
}

describe('findForBookingEvent', () => {
  it('мастер визита, владелица и администратор — без коллег-мастеров', async () => {
    const julia = await join('master', 'Юля');
    await join('master', 'Марта');
    const admin = await join('admin', 'Стойка');

    const audience = await repository.findForBookingEvent(julia);

    expect(audience?.masterName).toBe('Юля');
    expect(audience?.recipients).toHaveLength(3);
    expect(audience?.recipients.filter((row) => row.isVisitMaster)).toHaveLength(1);
    const adminUser = await testDb()
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.id, admin));
    expect(audience?.recipients.map((row) => row.userId)).toContain(adminUser[0]!.userId);
  });

  it('у соло-мастера — один получатель, и это она сама', async () => {
    const audience = await repository.findForBookingEvent(org.memberId);

    expect(audience?.recipients).toEqual([
      expect.objectContaining({ userId: org.userId, isVisitMaster: true }),
    ]);
  });

  it('отстранённый администратор уведомлений не получает', async () => {
    const julia = await join('master', 'Юля');
    const admin = await join('admin', 'Стойка');
    await testDb()
      .update(organizationMembers)
      .set({ status: 'disabled' })
      .where(eq(organizationMembers.id, admin));

    const audience = await repository.findForBookingEvent(julia);

    expect(audience?.recipients).toHaveLength(2);
  });

  it('администрация соседнего салона ничего не узнаёт', async () => {
    const other = await createOrg();

    const audience = await repository.findForBookingEvent(org.memberId);

    expect(audience?.recipients.map((row) => row.userId)).not.toContain(other.userId);
  });
});
