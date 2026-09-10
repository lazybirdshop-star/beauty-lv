import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg } from '../../../testing/factories';
import { TeamRepository } from './team.repository';

/**
 * Состав организации на живой базе.
 *
 * Два запроса здесь нельзя проверить моком в принципе: имя собирается
 * выражением `coalesce(nullif(trim(display_name), ''), full_name)`, а час
 * визита живёт не в записи, а в окне — счёт «записей сегодня» держится на
 * соединении, которого мок не видит.
 */

let repository: TeamRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new TeamRepository(testDb());
});

async function addMember(
  organizationId: string,
  overrides: { displayName?: string | null; status?: 'active' | 'invited' | 'disabled' } = {},
) {
  const [user] = await testDb()
    .insert(users)
    .values({
      email: `julia-${Date.now()}-${Math.random()}@example.com`,
      fullName: 'Юлия Озола',
    })
    .returning();
  const [member] = await testDb()
    .insert(organizationMembers)
    .values({
      organizationId,
      userId: user!.id,
      role: 'master',
      displayName: overrides.displayName ?? null,
      status: overrides.status ?? 'active',
    })
    .returning();
  return member!.id;
}

describe('TeamRepository.list', () => {
  it('чужих участников не показывает', async () => {
    const org = await createOrg();
    const stranger = await createOrg();
    await addMember(stranger.organizationId);

    const rows = await repository.list(org.organizationId, new Date(0), new Date());

    expect(rows.map((row) => row.id)).toEqual([org.memberId]);
  });

  it('имя в салоне побеждает имя аккаунта, пробелы за имя не считаются', async () => {
    const org = await createOrg();
    const named = await addMember(org.organizationId, { displayName: 'Юля' });
    const blank = await addMember(org.organizationId, { displayName: '  ' });

    const rows = await repository.list(org.organizationId, new Date(0), new Date());
    const byId = new Map(rows.map((row) => [row.id, row.name]));

    expect(byId.get(named)).toBe('Юля');
    expect(byId.get(blank)).toBe('Юлия Озола');
  });

  it('считает записи по часу окна, а не по дате создания записи', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2026-09-10T10:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2026-09-11T10:00:00.000Z') });

    const rows = await repository.list(
      org.organizationId,
      new Date('2026-09-10T00:00:00.000Z'),
      new Date('2026-09-11T00:00:00.000Z'),
    );

    /* Запись, созданная сегодня на завтра, сегодняшней не считается: у часа
       визита своё место — в окне. */
    expect(rows[0]!.bookingsToday).toBe(1);
  });
});

describe('TeamRepository — места тарифа и владельцы', () => {
  it('отстранённый места тарифа не занимает, приглашённый занимает', async () => {
    const org = await createOrg();
    await addMember(org.organizationId, { status: 'disabled' });
    await addMember(org.organizationId, { status: 'invited' });

    expect(await repository.countOccupied(org.organizationId)).toBe(2);
  });

  it('считает только живых владельцев своей организации', async () => {
    const org = await createOrg();
    const stranger = await createOrg();
    expect(await repository.countOwners(org.organizationId)).toBe(1);
    expect(await repository.countOwners(stranger.organizationId)).toBe(1);
  });

  it('возврат в строй не стирает имя, если нового не дали', async () => {
    const org = await createOrg();
    const julia = await addMember(org.organizationId, {
      displayName: 'Юля',
      status: 'disabled',
    });

    await repository.reviveMember(julia, 'admin', null);

    const [row] = await testDb()
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, julia));
    expect(row).toMatchObject({ displayName: 'Юля', role: 'admin', status: 'active' });
  });

  it('без подписки лимита нет', async () => {
    const org = await createOrg();
    expect(await repository.memberLimit(org.organizationId)).toBeNull();
  });
});
