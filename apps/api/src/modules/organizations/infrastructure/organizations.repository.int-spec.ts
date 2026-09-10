import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg } from '../../../testing/factories';
import { OrganizationsRepository } from './organizations.repository';

/**
 * Витрина салона и состояние салона.
 *
 * Колонка `organizations.status` до сих пор не читалась ни одним запросом:
 * администратор мог «приостановить» салон, а публичная страница продолжала
 * принимать записи. Здесь закреплено обратное — и то, что приостановка
 * закрывает витрину, и то, что она **не** отбирает у гостя уже назначенный
 * визит.
 */

let repository: OrganizationsRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new OrganizationsRepository(testDb());
});

async function slugOf(organizationId: string): Promise<string> {
  const [row] = await testDb()
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  return row!.slug;
}

describe('findPublicBySlug — витрина', () => {
  it('работающий салон отвечает по своему адресу', async () => {
    const org = await createOrg();

    expect(await repository.findPublicBySlug(await slugOf(org.organizationId))).not.toBeNull();
  });

  it('приостановленный салон витрину закрывает', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ status: 'suspended' })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.findPublicBySlug(await slugOf(org.organizationId))).toBeNull();
  });

  it('салон в архиве витрину закрывает тоже', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ status: 'archived' })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.findPublicBySlug(await slugOf(org.organizationId))).toBeNull();
  });

  it('удалённый салон не отвечает', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.findPublicBySlug(await slugOf(org.organizationId))).toBeNull();
  });
});

describe('findIdBySlug — доступ по токену визита', () => {
  it('приостановленный салон гостя со своим визитом не теряет', async () => {
    /* Приостановка — разговор с мастером, а не наказание её клиентов:
       назначенные визиты она обязана довести, а гость обязан их видеть. */
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ status: 'suspended' })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.findIdBySlug(await slugOf(org.organizationId))).toEqual({
      id: org.organizationId,
    });
  });

  it('удалённый салон недоступен и по токену', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.findIdBySlug(await slugOf(org.organizationId))).toBeNull();
  });

  it('чужой адрес — null', async () => {
    expect(await repository.findIdBySlug('nobody-here')).toBeNull();
  });
});

/**
 * Куда человек попадает после входа.
 *
 * Порядок здесь собран выражением `case when role = 'owner' …`, и проверить
 * его можно только настоящим планировщиком. Смысл же продуктовый: мастер может
 * работать в двух местах, и «какое-нибудь» из них означало бы, что при каждом
 * входе она попадает то в своё дело, то в чужое.
 */
describe('findMineForUser — куда пускает вход', () => {
  it('отстранённая в кабинет салона не попадает', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ status: 'disabled' })
      .where(eq(organizationMembers.id, org.memberId));

    expect(await repository.findMineForUser(org.userId)).toBeNull();
  });

  it('приглашённая — тоже: приглашение это ещё не место работы', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ status: 'invited' })
      .where(eq(organizationMembers.id, org.memberId));

    expect(await repository.findMineForUser(org.userId)).toBeNull();
  });

  it('своё дело идёт раньше найма', async () => {
    const own = await createOrg();
    const salon = await createOrg();
    /* Тот же человек нанят во второй салон — `organization_members` это
       позволяет с самого начала (SALON.md §8.5). */
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: salon.organizationId, userId: own.userId, role: 'master' });

    expect(await repository.findMineForUser(own.userId)).toMatchObject({
      id: own.organizationId,
      role: 'owner',
    });
  });
});
