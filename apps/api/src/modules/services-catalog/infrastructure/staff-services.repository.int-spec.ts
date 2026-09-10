import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, createService } from '../../../testing/factories';
import { StaffServicesRepository } from './staff-services.repository';

/**
 * Кто оказывает услугу — на живой базе.
 *
 * Не формальность: `listPerformers` собирает имя выражением
 * `coalesce(nullif(trim(display_name), ''), full_name)`, а такие вещи проверяет
 * только планировщик. Мок здесь доказал бы лишь то, что метод вызвали.
 */

let repository: StaffServicesRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new StaffServicesRepository(testDb());
});

/** Второй человек в организации — приглашённого сюда звать не за чем. */
async function addMember(organizationId: string, displayName: string | null) {
  const [user] = await testDb()
    .insert(users)
    .values({ email: `julia-${Date.now()}-${Math.random()}@example.com`, fullName: 'Юлия Озола' })
    .returning();
  const [member] = await testDb()
    .insert(organizationMembers)
    .values({ organizationId, userId: user!.id, role: 'master', displayName })
    .returning();
  return member!.id;
}

describe('StaffServicesRepository', () => {
  it('новая услуга достаётся всем, кто работает, и никому сверх того', async () => {
    const org = await createOrg();
    const other = await createOrg();
    await addMember(org.organizationId, null);
    const service = await createService(org);

    await repository.attachAllMembers(org.organizationId, service.id);

    const performers = await repository.listPerformers(org.organizationId, service.id);
    expect(performers).toHaveLength(2);
    expect(await repository.listPerformers(other.organizationId, service.id)).toEqual([]);
  });

  it('не заводит второй строки при повторном вызове', async () => {
    const org = await createOrg();
    const service = await createService(org);

    await repository.attachAllMembers(org.organizationId, service.id);
    await repository.attachAllMembers(org.organizationId, service.id);

    expect(await repository.countPerformers(service.id)).toBe(1);
  });

  it('отстранённый услуг не получает', async () => {
    const org = await createOrg();
    const disabled = await addMember(org.organizationId, null);
    await testDb()
      .update(organizationMembers)
      .set({ status: 'disabled' })
      .where(eq(organizationMembers.id, disabled));
    const service = await createService(org);

    await repository.attachAllMembers(org.organizationId, service.id);

    const performers = await repository.listPerformers(org.organizationId, service.id);
    expect(performers.map((row) => row.organizationMemberId)).toEqual([org.memberId]);
  });

  it('имя в салоне побеждает имя аккаунта, а пробелы за имя не считаются', async () => {
    const org = await createOrg();
    const named = await addMember(org.organizationId, 'Юля');
    const blank = await addMember(org.organizationId, '   ');
    const service = await createService(org);
    await repository.attachAllMembers(org.organizationId, service.id);

    const performers = await repository.listPerformers(org.organizationId, service.id);
    const byId = new Map(performers.map((row) => [row.organizationMemberId, row.name]));
    expect(byId.get(named)).toBe('Юля');
    /* Пустое имя в салоне — не имя: иначе в списке стояли бы пробелы. */
    expect(byId.get(blank)).toBe('Юлия Озола');
  });

  it('замена списка снимает прежних и ставит новых с их условиями', async () => {
    const org = await createOrg();
    const julia = await addMember(org.organizationId, 'Юля');
    const service = await createService(org);
    await repository.attachAllMembers(org.organizationId, service.id);

    await repository.replacePerformers(org.organizationId, service.id, [
      { organizationMemberId: julia, priceOverrideAmount: 5000, durationOverrideMinutes: 75 },
    ]);

    const performers = await repository.listPerformers(org.organizationId, service.id);
    expect(performers).toEqual([
      expect.objectContaining({
        organizationMemberId: julia,
        priceOverrideAmount: 5000,
        durationOverrideMinutes: 75,
      }),
    ]);
  });

  it('чужого участника в список исполнителей не пускает', async () => {
    const org = await createOrg();
    const stranger = await createOrg();
    const service = await createService(org);

    await repository.replacePerformers(org.organizationId, service.id, [
      { organizationMemberId: stranger.memberId },
      { organizationMemberId: org.memberId },
    ]);

    const performers = await repository.listPerformers(org.organizationId, service.id);
    expect(performers.map((row) => row.organizationMemberId)).toEqual([org.memberId]);
  });

  it('условия мастера возвращаются только по существующим парам', async () => {
    const org = await createOrg();
    const service = await createService(org);
    const untouched = await createService(org);
    await repository.replacePerformers(org.organizationId, service.id, [
      { organizationMemberId: org.memberId, priceOverrideAmount: 5000 },
    ]);

    const terms = await repository.findOverrides(org.memberId, [service.id, untouched.id]);

    /* Отсутствие строки читается как «не оказывает» — на этом стоит SL-8, и
       подставлять за мастера прайс организации нельзя. */
    expect(terms).toEqual([
      { serviceId: service.id, priceOverrideAmount: 5000, durationOverrideMinutes: null },
    ]);
  });

  it('пришедший в салон делает всё, что есть в прайсе', async () => {
    const org = await createOrg();
    const manicure = await createService(org);
    const brows = await createService(org, { name: 'Брови' });
    const stranger = await createOrg();
    await createService(stranger, { name: 'Чужая' });
    const julia = await addMember(org.organizationId, null);

    await repository.attachAllServices(org.organizationId, julia);

    const terms = await repository.findOverrides(julia, [manicure.id, brows.id]);
    expect(terms.map((term) => term.serviceId).sort()).toEqual([manicure.id, brows.id].sort());
    /* Прайс чужой организации к нему не прилипает: обе ссылки несут
       организацию, но условие по ней ставит тот, кто пишет. */
    expect(await repository.countPerformers(manicure.id)).toBe(1);
  });
});
