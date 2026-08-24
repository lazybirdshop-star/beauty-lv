import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg } from '../../../testing/factories';
import { OrganizationsAdminRepository } from './organizations-admin.repository';

/**
 * Список салонов платформы — против живого Postgres.
 *
 * Факт публикации страницы собирается шаблоном `sql`, счётчики участников и
 * записей — группировкой по организации, а владелец подтягивается `LEFT JOIN`.
 * Ни то, ни другое типы не проверяют.
 */

let repository: OrganizationsAdminRepository;
const WHOLE_LIST = { limit: 100, offset: 0 };

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new OrganizationsAdminRepository(testDb());
});

describe('list — салоны платформы', () => {
  it('на пустой платформе — пустая страница, а не падение', async () => {
    expect(await repository.list(WHOLE_LIST)).toEqual({ items: [], total: 0 });
  });

  it('салон приходит с владельцем и счётчиками', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const [row] = (await repository.list(WHOLE_LIST)).items;

    expect(row?.ownerName).toBe('Мастер');
    expect(row?.mastersCount).toBe(1);
    expect(row?.bookingsCount).toBe(1);
    expect(row?.lastBookingAt).toBeInstanceOf(Date);
  });

  it('салон без подписки из списка не исчезает', async () => {
    /* Иначе панель перестанет показывать ровно тех, к кому есть вопросы по
       оплате. */
    await createOrg();

    const [row] = (await repository.list(WHOLE_LIST)).items;

    expect(row?.planName).toBeNull();
    expect(row?.subscriptionStatus).toBeNull();
  });

  it('удалённый салон не показывается', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect((await repository.list(WHOLE_LIST)).items).toEqual([]);
  });

  it('поиск идёт по названию, адресу и владельцу', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ name: 'Студия Озолы', slug: 'ozola-studio' })
      .where(eq(organizations.id, org.organizationId));
    await createOrg();

    expect((await repository.list({ ...WHOLE_LIST, query: 'озол' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: 'ozola-stu' })).total).toBe(1);
  });

  it('фильтр по состоянию сужает список', async () => {
    const first = await createOrg();
    await createOrg();
    await repository.setStatus(first.organizationId, 'suspended');

    expect((await repository.list({ ...WHOLE_LIST, status: 'suspended' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, status: 'active' })).total).toBe(1);
  });

  it('счётчики не перетекают между салонами', async () => {
    const busy = await createOrg();
    await createOrg();
    await createBooking(busy, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const items = (await repository.list(WHOLE_LIST)).items;

    expect(items.find((row) => row.id === busy.organizationId)?.bookingsCount).toBe(1);
    expect(items.filter((row) => row.bookingsCount === 0)).toHaveLength(1);
  });

  it('участник, ушедший из салона, в счётчике мастеров не остаётся', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ status: 'disabled' })
      .where(eq(organizationMembers.userId, org.userId));

    expect((await repository.list(WHOLE_LIST)).items[0]?.mastersCount).toBe(0);
  });

  it('страница ограничена, а total считает всех', async () => {
    await createOrg();
    await createOrg();
    await createOrg();

    const page = await repository.list({ limit: 2, offset: 0 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });
});

describe('setStatus — приостановка и архив', () => {
  it('возвращает салон в новом состоянии', async () => {
    const org = await createOrg();

    const updated = await repository.setStatus(org.organizationId, 'suspended');

    expect(updated?.status).toBe('suspended');
    expect(updated?.id).toBe(org.organizationId);
  });

  it('несуществующий салон — null, а не ошибка', async () => {
    expect(
      await repository.setStatus('99999999-9999-4999-8999-999999999999', 'archived'),
    ).toBeNull();
  });

  it('удалённый салон не воскрешается', async () => {
    /* Строки с `deleted_at` для платформы уже нет: «разархивировать» её
       значило бы вернуть клиентам страницу, которую мастер закрыла. */
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect(await repository.setStatus(org.organizationId, 'active')).toBeNull();
  });

  it('владелец аккаунта салона в ответе назван', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ fullName: 'Алиса' }).where(eq(users.id, org.userId));

    expect((await repository.setStatus(org.organizationId, 'archived'))?.ownerName).toBe('Алиса');
  });
});
