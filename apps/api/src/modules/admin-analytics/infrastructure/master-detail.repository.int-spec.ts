import { eq } from 'drizzle-orm';

import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { services } from '../../../shared/database/schema/services';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createClient, createOrg, createService } from '../../../testing/factories';
import { MasterDetailRepository } from './master-detail.repository';

/**
 * Карточка мастера — против живого Postgres.
 *
 * Здесь два места, которые типы не проверяют: факт публикации страницы
 * собирается шаблоном `sql` (`page_design is not null`), а три счётчика
 * считаются группировкой по организации. Сведи их когда-нибудь в один запрос
 * через `JOIN` — и «услуг 240» там, где их двенадцать, увидит только база.
 */

let repository: MasterDetailRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new MasterDetailRepository(testDb());
});

describe('find — карточка мастера', () => {
  it('несуществующий аккаунт — null, а не ошибка', async () => {
    expect(await repository.find('99999999-9999-4999-8999-999999999999')).toBeNull();
  });

  it('удалённый аккаунт карточки не имеет', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ deletedAt: new Date() }).where(eq(users.id, org.userId));

    expect(await repository.find(org.userId)).toBeNull();
  });

  it('в ответе нет хеша пароля и версии токена', async () => {
    const org = await createOrg();

    const master = await repository.find(org.userId);

    expect(master).not.toHaveProperty('passwordHash');
    expect(master).not.toHaveProperty('tokenVersion');
  });

  it('мастер без салона — карточка есть, салонов ноль', async () => {
    const [user] = await testDb()
      .insert(users)
      .values({ email: 'lonely@example.com', fullName: 'Без салона', systemRole: 'master' })
      .returning();

    const master = await repository.find(user!.id);

    expect(master?.organizations).toEqual([]);
  });
});

describe('организации мастера', () => {
  it('салон приходит с ролью мастера в нём', async () => {
    const org = await createOrg();

    const master = await repository.find(org.userId);

    expect(master?.organizations[0]?.role).toBe('owner');
  });

  it('оба салона видны, а не только основной', async () => {
    /* «Мастер жалуется, что пропали записи» решается тем, в каком именно
       салоне она их ищет. */
    const owned = await createOrg();
    const employed = await createOrg();
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: employed.organizationId, userId: owned.userId, role: 'master' });

    const master = await repository.find(owned.userId);

    expect(master?.organizations).toHaveLength(2);
  });

  it('удалённый салон в карточке не показывается', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect((await repository.find(org.userId))?.organizations).toEqual([]);
  });

  it('факт публикации страницы приходит булевым, а не самим оформлением', async () => {
    const org = await createOrg();

    const before = await repository.find(org.userId);
    await testDb()
      .update(organizations)
      .set({ pageDesign: { version: 1 } as never })
      .where(eq(organizations.id, org.organizationId));
    const after = await repository.find(org.userId);

    expect(before?.organizations[0]?.pagePublished).toBe(false);
    expect(after?.organizations[0]?.pagePublished).toBe(true);
  });
});

describe('счётчики салона', () => {
  it('пустой салон — нули, а не отсутствующие поля', async () => {
    const org = await createOrg();

    const [organization] = (await repository.find(org.userId))!.organizations;

    expect(organization).toMatchObject({
      servicesCount: 0,
      clientsCount: 0,
      bookingsCount: 0,
      lastBookingAt: null,
    });
  });

  it('услуги, клиенты и записи считаются каждый по своей таблице', async () => {
    /* Три счётчика в одном запросе через JOIN множили бы строки друг друга —
       ровно так получают «услуг 240» там, где их двенадцать. */
    const org = await createOrg();
    await createService(org, { name: 'Маникюр' });
    await createService(org, { name: 'Педикюр' });
    await createClient(org, { phone: '+37120000111' });
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const [organization] = (await repository.find(org.userId))!.organizations;

    expect(organization?.servicesCount).toBe(3); // две свои плюс услуга записи
    expect(organization?.clientsCount).toBe(1);
    expect(organization?.bookingsCount).toBe(1);
    expect(organization?.lastBookingAt).toBeInstanceOf(Date);
  });

  it('снятая с прайса услуга не считается', async () => {
    const org = await createOrg();
    const service = await createService(org, { name: 'Снятая' });

    const before = (await repository.find(org.userId))!.organizations[0]!.servicesCount;
    await testDb()
      .update(services)
      .set({ deletedAt: new Date() })
      .where(eq(services.id, service.id));
    const after = (await repository.find(org.userId))!.organizations[0]!.servicesCount;

    expect(before).toBe(1);
    expect(after).toBe(0);
  });

  it('счётчики не перетекают между салонами', async () => {
    const first = await createOrg();
    const second = await createOrg();
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: second.organizationId, userId: first.userId, role: 'master' });
    await createService(second, { name: 'Только во втором' });

    const master = await repository.find(first.userId);
    const counts = master!.organizations.map((organization) => organization.servicesCount);

    expect(counts.sort()).toEqual([0, 1]);
  });
});
