import { eq } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { pushSubscriptions } from '../../../shared/database/schema/push-subscriptions';
import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg } from '../../../testing/factories';
import { PlatformHealthRepository } from './platform-health.repository';

/**
 * Состояние платформы — против живого Postgres.
 *
 * Ключевая проверка здесь одна: «скольких администраторов уведомление
 * найдёт» считается по **людям**, а не по подпискам. Три устройства одного
 * человека при двух молчащих коллегах — это не покрытие, а видимость
 * покрытия, и `count(distinct …)` отличает одно от другого.
 */

let repository: PlatformHealthRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new PlatformHealthRepository(testDb());
});

async function admin(): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({
      email: `admin-${Math.random()}@example.com`,
      fullName: 'Администратор',
      systemRole: 'platform_admin',
    })
    .returning();
  return row!.id;
}

async function subscribe(userId: string): Promise<void> {
  await testDb()
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: `https://push.example.com/${Math.random()}`,
      p256dh: 'key',
      auth: 'auth',
    });
}

describe('collect — факты о платформе', () => {
  it('на пустой платформе — нули, а не падение', async () => {
    expect(await repository.collect()).toMatchObject({
      databaseOk: true,
      admins: 0,
      adminsReachable: 0,
      pendingRequests: 0,
      bookingsLast24h: 0,
    });
  });

  it('считает администраторов, а не всех пользователей', async () => {
    await admin();
    await createOrg();

    expect((await repository.collect()).admins).toBe(1);
  });

  it('два устройства одного администратора — это один достижимый', async () => {
    const first = await admin();
    await admin();
    await subscribe(first);
    await subscribe(first);

    const facts = await repository.collect();

    expect(facts.admins).toBe(2);
    expect(facts.adminsReachable).toBe(1);
    expect(facts.pushSubscriptions).toBe(2);
  });

  it('подписка мастера не делает достижимым администратора', async () => {
    await admin();
    const org = await createOrg();
    await subscribe(org.userId);

    expect((await repository.collect()).adminsReachable).toBe(0);
  });

  it('заблокированный администратор не считается', async () => {
    const blocked = await admin();
    await testDb().update(users).set({ accountStatus: 'blocked' }).where(eq(users.id, blocked));

    expect((await repository.collect()).admins).toBe(0);
  });

  it('считает только ожидающие заявки', async () => {
    await testDb()
      .insert(registrationRequests)
      .values([
        { fullName: 'А', email: 'a@example.com', phone: '+37120000001', status: 'pending' },
        { fullName: 'Б', email: 'b@example.com', phone: '+37120000002', status: 'approved' },
      ]);

    expect((await repository.collect()).pendingRequests).toBe(1);
  });

  it('записи считаются за последние сутки', async () => {
    const org = await createOrg();
    const fresh = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const old = await createBooking(org, { startsAt: new Date('2030-05-02T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ createdAt: new Date('2020-01-01T00:00:00.000Z') })
      .where(eq(bookings.id, old.id));

    const facts = await repository.collect();

    expect(facts.bookingsLast24h).toBe(1);
    expect(fresh.id).toBeTruthy();
  });
});
