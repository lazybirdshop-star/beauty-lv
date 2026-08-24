import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { AuditLogRepository } from './audit-log.repository';

/**
 * Журнал — против живого Postgres.
 *
 * Раньше экран забирал последние двести записей и фильтровал их в браузере:
 * на вопрос «кто заблокировал этого мастера в июне» ответить было нельзя в
 * принципе — июнь в двести последних строк не попадал. Здесь закреплено, что
 * сита и отрезок времени работают в самом запросе.
 */

let repository: AuditLogRepository;
const WHOLE_LIST = { limit: 100, offset: 0 };

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new AuditLogRepository(testDb());
});

async function actor(fullName = 'Администратор'): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({
      email: `admin-${Math.random()}@example.com`,
      fullName,
      systemRole: 'platform_admin',
    })
    .returning();
  return row!.id;
}

const ENTITY = '11111111-1111-4111-8111-111111111111';

describe('list — сита журнала', () => {
  it('пустой журнал — пустая страница', async () => {
    expect(await repository.list(WHOLE_LIST)).toEqual({ items: [], total: 0 });
  });

  it('запись приходит с именем того, кто действовал', async () => {
    const actorId = await actor('Алиса');
    await repository.record({
      actorUserId: actorId,
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });

    expect((await repository.list(WHOLE_LIST)).items[0]?.actorName).toBe('Алиса');
  });

  it('фильтр по действию сужает журнал', async () => {
    const actorId = await actor();
    await repository.record({
      actorUserId: actorId,
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });
    await repository.record({
      actorUserId: actorId,
      action: 'user.role_changed',
      entityType: 'user',
      entityId: ENTITY,
    });

    expect((await repository.list({ ...WHOLE_LIST, action: 'master.blocked' })).total).toBe(1);
  });

  it('поиск идёт по имени и по действию', async () => {
    await repository.record({
      actorUserId: await actor('Марис Берзиньш'),
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });

    expect((await repository.list({ ...WHOLE_LIST, query: 'берзин' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: 'blocked' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: 'нет такого' })).total).toBe(0);
  });

  it('отрезок времени полуоткрытый справа', async () => {
    const actorId = await actor();
    await repository.record({
      actorUserId: actorId,
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });

    const inside = await repository.list({
      ...WHOLE_LIST,
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    });
    const before = await repository.list({
      ...WHOLE_LIST,
      to: new Date(Date.now() - 60_000),
    });

    expect(inside.total).toBe(1);
    expect(before.total).toBe(0);
  });

  it('страница ограничена, а total считает всех', async () => {
    const actorId = await actor();
    for (const action of ['a.one', 'a.two', 'a.three']) {
      await repository.record({
        actorUserId: actorId,
        action,
        entityType: 'user',
        entityId: ENTITY,
      });
    }

    const page = await repository.list({ limit: 2, offset: 0 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });

  it('новые записи идут первыми', async () => {
    const actorId = await actor();
    await repository.record({
      actorUserId: actorId,
      action: 'first',
      entityType: 'user',
      entityId: ENTITY,
    });
    await repository.record({
      actorUserId: actorId,
      action: 'second',
      entityType: 'user',
      entityId: ENTITY,
    });

    expect((await repository.list(WHOLE_LIST)).items[0]?.action).toBe('second');
  });
});

describe('listActions — сита собираются из данных', () => {
  it('на пустом журнале — пустой список, а не выдуманные значения', async () => {
    expect(await repository.listActions()).toEqual([]);
  });

  it('каждое действие названо один раз', async () => {
    const actorId = await actor();
    await repository.record({
      actorUserId: actorId,
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });
    await repository.record({
      actorUserId: actorId,
      action: 'master.blocked',
      entityType: 'user',
      entityId: ENTITY,
    });

    expect(await repository.listActions()).toEqual(['master.blocked']);
  });
});
