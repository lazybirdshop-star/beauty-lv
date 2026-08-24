import { eq } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { organizations } from '../../../shared/database/schema/organizations';
import { services } from '../../../shared/database/schema/services';
import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, createService, createSlot } from '../../../testing/factories';
import { FunnelRepository } from './funnel.repository';

/**
 * Воронка — против живого Postgres.
 *
 * Каждый шаг здесь собран шаблоном `sql` с коррелированным `EXISTS`, и ни
 * один из них не проверяют типы: либо запрос исполняется, либо главная
 * админки падает целиком. Отдельно закреплено, что шаги считают **салоны**,
 * а не строки: салон с сорока услугами и салон с одной проходят шаг
 * одинаково.
 */

let repository: FunnelRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new FunnelRepository(testDb());
});

describe('collect — путь мастера', () => {
  it('на пустой платформе — нули, а не падение', async () => {
    expect(await repository.collect()).toMatchObject({
      masters: 0,
      withOrganization: 0,
      withServices: 0,
      withSlots: 0,
      withPublishedPage: 0,
      withBooking: 0,
      activeLast30Days: 0,
    });
  });

  it('мастер без салона стоит на первом шаге', async () => {
    await testDb()
      .insert(users)
      .values({ email: 'lonely@example.com', fullName: 'Без салона', systemRole: 'master' });

    const funnel = await repository.collect();

    expect(funnel.masters).toBe(1);
    expect(funnel.withOrganization).toBe(0);
  });

  it('сорок услуг одного салона — это один пройденный шаг', async () => {
    const org = await createOrg();
    await createService(org, { name: 'Маникюр' });
    await createService(org, { name: 'Педикюр' });

    expect((await repository.collect()).withServices).toBe(1);
  });

  it('снятая с прайса услуга шаг не засчитывает', async () => {
    const org = await createOrg();
    const service = await createService(org, { name: 'Снятая' });
    await testDb()
      .update(services)
      .set({ deletedAt: new Date() })
      .where(eq(services.id, service.id));

    expect((await repository.collect()).withServices).toBe(0);
  });

  it('открытые окна и опубликованная страница — разные шаги', async () => {
    const org = await createOrg();
    await createSlot(org, new Date('2030-05-01T09:00:00.000Z'));

    const before = await repository.collect();
    await testDb()
      .update(organizations)
      .set({ pageDesign: { version: 1 } as never })
      .where(eq(organizations.id, org.organizationId));
    const after = await repository.collect();

    expect(before.withSlots).toBe(1);
    expect(before.withPublishedPage).toBe(0);
    expect(after.withPublishedPage).toBe(1);
  });

  it('первая запись засчитывает шаг, удалённая — нет', async () => {
    const org = await createOrg();
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const before = await repository.collect();
    await testDb()
      .update(bookings)
      .set({ deletedAt: new Date() })
      .where(eq(bookings.id, booking.id));
    const after = await repository.collect();

    expect(before.withBooking).toBe(1);
    expect(after.withBooking).toBe(0);
  });

  it('активность за 30 дней считается по дате создания записи', async () => {
    const org = await createOrg();
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const fresh = await repository.collect();
    await testDb()
      .update(bookings)
      .set({ createdAt: new Date('2020-01-01T00:00:00.000Z') })
      .where(eq(bookings.id, booking.id));
    const stale = await repository.collect();

    expect(fresh.activeLast30Days).toBe(1);
    expect(stale.activeLast30Days).toBe(0);
    // Сам факт первой записи при этом никуда не девается — это разные вопросы.
    expect(stale.withBooking).toBe(1);
  });

  it('заявки разложены по исходам', async () => {
    await testDb()
      .insert(registrationRequests)
      .values([
        { fullName: 'А', email: 'a@example.com', phone: '+37120000001', status: 'pending' },
        { fullName: 'Б', email: 'b@example.com', phone: '+37120000002', status: 'approved' },
        { fullName: 'В', email: 'c@example.com', phone: '+37120000003', status: 'rejected' },
        { fullName: 'Г', email: 'd@example.com', phone: '+37120000004', status: 'rejected' },
      ]);

    expect((await repository.collect()).requests).toEqual({
      pending: 1,
      approved: 1,
      rejected: 2,
    });
  });

  it('удалённый салон из воронки выпадает целиком', async () => {
    const org = await createOrg();
    await createService(org, { name: 'Маникюр' });
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect((await repository.collect()).withServices).toBe(0);
  });
});
