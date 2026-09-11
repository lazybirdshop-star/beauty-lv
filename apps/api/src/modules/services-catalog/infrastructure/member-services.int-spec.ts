import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { services } from '../../../shared/database/schema/services';
import { staffServices } from '../../../shared/database/schema/staff-services';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, createService, type TestOrg } from '../../../testing/factories';
import { StaffServicesRepository } from './staff-services.repository';

/**
 * Услуги одного мастера — против живого Postgres.
 *
 * Обе границы держатся условиями внутри запросов: прайс чужой организации не
 * попадает в список через соединение, а замена набора одного мастера не
 * задевает коллегу и чужие услуги только потому, что условие стоит в самом
 * `DELETE` и в отборе перед `INSERT`. Мок ни того ни другого не выполняет.
 */

let repository: StaffServicesRepository;
let org: TestOrg;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new StaffServicesRepository(testDb());
  org = await createOrg();
});

async function colleague(): Promise<string> {
  const person = await createOrg();
  const [member] = await testDb()
    .insert(organizationMembers)
    .values({ organizationId: org.organizationId, userId: person.userId, role: 'master' })
    .returning();
  return member!.id;
}

describe('listForMember', () => {
  it('весь прайс — с отметкой, что мастер оказывает и на своих ли условиях', async () => {
    const cut = await createService(org, { name: 'Стрижка' });
    await createService(org, { name: 'Окрашивание' });
    await testDb()
      .insert(staffServices)
      .values({ serviceId: cut.id, organizationMemberId: org.memberId, priceOverrideAmount: 4500 });

    const list = await repository.listForMember(org.organizationId, org.memberId);

    expect(list.map((row) => [row.name, row.performs, row.priceOverrideAmount])).toEqual([
      ['Окрашивание', false, null],
      ['Стрижка', true, 4500],
    ]);
  });

  it('удалённая и чужая услуги в список не попадают', async () => {
    const gone = await createService(org, { name: 'Старая' });
    await testDb().update(services).set({ deletedAt: new Date() }).where(eq(services.id, gone.id));
    const other = await createOrg();
    await createService(other, { name: 'Чужая' });

    expect(await repository.listForMember(org.organizationId, org.memberId)).toEqual([]);
  });
});

describe('replaceForMember', () => {
  it('заменяет набор одного мастера и не трогает коллегу', async () => {
    const cut = await createService(org, { name: 'Стрижка' });
    const color = await createService(org, { name: 'Окрашивание' });
    const julia = await colleague();
    await testDb()
      .insert(staffServices)
      .values([
        { serviceId: cut.id, organizationMemberId: org.memberId },
        { serviceId: cut.id, organizationMemberId: julia },
      ]);

    await repository.replaceForMember(org.organizationId, org.memberId, [
      { serviceId: color.id, durationOverrideMinutes: 90 },
    ]);

    const rows = await testDb().select().from(staffServices);
    const pairs = rows
      .map((row) => `${row.serviceId}:${row.organizationMemberId}:${row.durationOverrideMinutes}`)
      .sort();
    expect(pairs).toEqual([`${color.id}:${org.memberId}:90`, `${cut.id}:${julia}:null`].sort());
  });

  it('чужая услуга, названная по идентификатору, отсеивается', async () => {
    const other = await createOrg();
    const foreign = await createService(other, { name: 'Чужая' });

    await repository.replaceForMember(org.organizationId, org.memberId, [
      { serviceId: foreign.id },
    ]);

    expect(await testDb().select().from(staffServices)).toEqual([]);
  });

  it('пустой набор снимает мастера со всех услуг', async () => {
    const cut = await createService(org, { name: 'Стрижка' });
    await testDb()
      .insert(staffServices)
      .values({ serviceId: cut.id, organizationMemberId: org.memberId });

    await repository.replaceForMember(org.organizationId, org.memberId, []);

    expect(await repository.listForMember(org.organizationId, org.memberId)).toMatchObject([
      { performs: false },
    ]);
  });
});

describe('isMember', () => {
  it('участник чужой организации — не участник', async () => {
    const other = await createOrg();

    expect(await repository.isMember(org.organizationId, org.memberId)).toBe(true);
    expect(await repository.isMember(org.organizationId, other.memberId)).toBe(false);
  });
});
