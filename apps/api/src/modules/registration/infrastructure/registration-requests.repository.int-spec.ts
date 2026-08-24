import { eq } from 'drizzle-orm';

import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg } from '../../../testing/factories';
import {
  RegistrationPendingError,
  RegistrationRequestsRepository,
} from './registration-requests.repository';

/**
 * Очередь заявок — против живого Postgres.
 *
 * Здесь два места, которые типы не проверяют: частичный уникальный индекс
 * «одна открытая заявка на адрес» и сортировка `case when status = 'pending'`.
 * Оба существуют только в базе.
 */

let repository: RegistrationRequestsRepository;
const WHOLE_LIST = { limit: 100, offset: 0 };

const REQUEST = {
  fullName: 'Алиса Озола',
  email: 'alisa@example.com',
  phone: '+37126000001',
  locale: 'ru',
  passwordHash: 'hash',
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new RegistrationRequestsRepository(testDb());
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

describe('submit — подача заявки', () => {
  it('адрес приводится к нижнему регистру', async () => {
    const request = await repository.submit({ ...REQUEST, email: 'Alisa@Example.COM' });

    expect(request.email).toBe('alisa@example.com');
    expect(request.status).toBe('pending');
  });

  it('вторая заявка с тем же адресом не встаёт в очередь', async () => {
    /* Три одинаковые заявки от одного человека — не три решения, а одно,
       принимаемое трижды. */
    await repository.submit(REQUEST);

    await expect(repository.submit(REQUEST)).rejects.toBeInstanceOf(RegistrationPendingError);
  });

  it('регистр адреса обойти запрет не помогает', async () => {
    await repository.submit(REQUEST);

    await expect(
      repository.submit({ ...REQUEST, email: 'ALISA@example.com' }),
    ).rejects.toBeInstanceOf(RegistrationPendingError);
  });

  it('после отказа подать заявку снова можно', async () => {
    // Человек имеет право прийти снова — например, исправив то, из-за чего отказали.
    const first = await repository.submit(REQUEST);
    await repository.reject(first.id, await admin(), 'Пока не берём');

    await expect(repository.submit(REQUEST)).resolves.toMatchObject({ status: 'pending' });
  });
});

describe('list — очередь', () => {
  it('ожидающие идут первыми, решённые следом', async () => {
    const decided = await repository.submit(REQUEST);
    await repository.reject(decided.id, await admin(), 'Причина отказа целиком');
    await repository.submit({ ...REQUEST, email: 'second@example.com' });

    const { items } = await repository.list(WHOLE_LIST);

    expect(items[0]?.status).toBe('pending');
    expect(items[1]?.status).toBe('rejected');
  });

  it('хеш пароля наружу не отдаётся', async () => {
    await repository.submit(REQUEST);

    const [item] = (await repository.list(WHOLE_LIST)).items;

    expect(item).not.toHaveProperty('passwordHash');
  });

  it('поиск идёт по имени, почте и телефону', async () => {
    await repository.submit(REQUEST);
    await repository.submit({ ...REQUEST, email: 'maris@example.com', fullName: 'Марис' });

    expect((await repository.list({ ...WHOLE_LIST, query: 'озол' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: '37126' })).total).toBe(2);
  });

  it('фильтр по состоянию сужает очередь', async () => {
    const rejected = await repository.submit(REQUEST);
    await repository.reject(rejected.id, await admin(), 'Причина отказа целиком');
    await repository.submit({ ...REQUEST, email: 'second@example.com' });

    expect((await repository.list({ ...WHOLE_LIST, status: 'pending' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, status: 'rejected' })).total).toBe(1);
  });

  it('кто решил — видно в списке', async () => {
    const request = await repository.submit(REQUEST);
    const adminId = await admin();
    await repository.reject(request.id, adminId, 'Причина отказа целиком');

    expect((await repository.list(WHOLE_LIST)).items[0]?.decidedByName).toBe('Администратор');
  });
});

describe('countPending — число для значка', () => {
  it('считает только ожидающие', async () => {
    const rejected = await repository.submit(REQUEST);
    await repository.reject(rejected.id, await admin(), 'Причина отказа целиком');
    await repository.submit({ ...REQUEST, email: 'second@example.com' });

    expect(await repository.countPending()).toBe(1);
  });
});

describe('решение по заявке', () => {
  it('заявку нельзя взять в работу дважды', async () => {
    /* Два администратора, открывшие очередь одновременно, иначе завели бы два
       аккаунта на один адрес. */
    const request = await repository.submit(REQUEST);
    const adminId = await admin();

    const first = await repository.claimForApproval(request.id, adminId);
    const second = await repository.claimForApproval(request.id, adminId);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('взятая в работу заявка сохраняет хеш до создания аккаунта', async () => {
    const request = await repository.submit(REQUEST);

    const claimed = await repository.claimForApproval(request.id, await admin());

    expect(claimed?.passwordHash).toBe('hash');
  });

  it('возврат в очередь снимает решение целиком', async () => {
    const request = await repository.submit(REQUEST);
    await repository.claimForApproval(request.id, await admin());

    await repository.releaseClaim(request.id);
    const [row] = await testDb()
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, request.id));

    expect(row).toMatchObject({ status: 'pending', decidedAt: null, decidedByUserId: null });
    expect(row?.passwordHash).toBe('hash');
  });

  it('завершение одобрения стирает хеш пароля', async () => {
    const request = await repository.submit(REQUEST);
    const adminId = await admin();
    await repository.claimForApproval(request.id, adminId);

    const org = await createOrg();
    await repository.finishApproval(request.id, {
      userId: org.userId,
      organizationId: org.organizationId,
    });
    const [row] = await testDb()
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, request.id));

    expect(row?.passwordHash).toBeNull();
  });

  it('отказ стирает хеш пароля и сохраняет причину', async () => {
    const request = await repository.submit(REQUEST);

    const rejected = await repository.reject(request.id, await admin(), 'Профиль не про красоту');

    expect(rejected?.passwordHash).toBeNull();
    expect(rejected?.rejectionReason).toBe('Профиль не про красоту');
  });

  it('решённую заявку отклонить повторно нельзя', async () => {
    const request = await repository.submit(REQUEST);
    const adminId = await admin();
    await repository.claimForApproval(request.id, adminId);

    expect(await repository.reject(request.id, adminId, 'Причина отказа целиком')).toBeNull();
  });
});
