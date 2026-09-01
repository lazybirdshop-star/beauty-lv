import { eq } from 'drizzle-orm';

import { pushSubscriptions } from '../../../shared/database/schema/push-subscriptions';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

/**
 * Перепривязка подписки — против живого Postgres.
 *
 * Условие переезда строки живёт в `ON CONFLICT ... WHERE`, то есть в шаблоне
 * `sql`: типы его не проверяют, а мок не воспроизводит вовсе — он не знает ни
 * про конфликт по `endpoint`, ни про то, что при неподошедшем условии
 * обновление молча не происходит. Проверить это может только база.
 */

let repository: PushSubscriptionsRepository;

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

async function createUser(email: string): Promise<string> {
  const [user] = await testDb()
    .insert(users)
    .values({ email, fullName: 'Мастер', systemRole: 'master' })
    .returning();
  return user!.id;
}

async function ownerOf(endpoint: string) {
  const [row] = await testDb()
    .select({ userId: pushSubscriptions.userId, p256dh: pushSubscriptions.p256dh })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  return row;
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new PushSubscriptionsRepository(testDb());
});

describe('save — endpoint не является доказательством владения', () => {
  it('чужой endpoint со своими ключами строку не уводит', async () => {
    /* Адрес подписки не секрет: он виден push-сервису и остаётся в браузере.
       Прежде знающий его присылал свои ключи и забирал уведомления мастера
       себе — она переставала получать записи и узнавала об этом, только не
       дождавшись ни одной. */
    const master = await createUser('master@example.com');
    const attacker = await createUser('attacker@example.com');
    await repository.save(master, { endpoint: ENDPOINT, p256dh: 'ключ-мастера', auth: 'секрет' });

    await repository.save(attacker, {
      endpoint: ENDPOINT,
      p256dh: 'ключ-чужой',
      auth: 'секрет-чужой',
    });

    expect((await ownerOf(ENDPOINT))?.userId).toBe(master);
  });

  it('общий планшет салона работает: те же ключи — строка переезжает', async () => {
    /* Браузер отдаёт ту же подписку с теми же ключами, кто бы в нём ни вошёл.
       Это и отличает вторую мастер за общим планшетом от подделки. */
    const first = await createUser('first@example.com');
    const second = await createUser('second@example.com');
    await repository.save(first, { endpoint: ENDPOINT, p256dh: 'ключ', auth: 'секрет' });

    await repository.save(second, { endpoint: ENDPOINT, p256dh: 'ключ', auth: 'секрет' });

    expect((await ownerOf(ENDPOINT))?.userId).toBe(second);
  });

  it('свои ключи обновляются всегда: подписка их меняет', async () => {
    const master = await createUser('master@example.com');
    await repository.save(master, { endpoint: ENDPOINT, p256dh: 'старый', auth: 'секрет' });

    await repository.save(master, { endpoint: ENDPOINT, p256dh: 'новый', auth: 'секрет-2' });

    expect(await ownerOf(ENDPOINT)).toEqual({ userId: master, p256dh: 'новый' });
  });

  it('повторная подписка того же устройства не плодит строк', async () => {
    const master = await createUser('master@example.com');
    await repository.save(master, { endpoint: ENDPOINT, p256dh: 'ключ', auth: 'секрет' });
    await repository.save(master, { endpoint: ENDPOINT, p256dh: 'ключ', auth: 'секрет' });

    expect(await repository.listForUser(master)).toHaveLength(1);
  });
});
