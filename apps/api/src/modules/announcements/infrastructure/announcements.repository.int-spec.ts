import { eq } from 'drizzle-orm';

import { announcements } from '../../../shared/database/schema/announcements';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { AnnouncementsRepository } from './announcements.repository';

/**
 * Объявления — против живого Postgres.
 *
 * Главное здесь — отбор «что мастер должна увидеть прямо сейчас»: три
 * условия сразу, включая `LEFT JOIN ... IS NULL` на отметке «прочитано».
 * Такой отбор легко превратить в противоположный одной ошибкой в условии
 * соединения, и увидит это только база.
 */

let repository: AnnouncementsRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new AnnouncementsRepository(testDb());
});

async function person(fullName = 'Мастер'): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({ email: `user-${Math.random()}@example.com`, fullName })
    .returning();
  return row!.id;
}

async function announce(
  author: string,
  overrides: { startsAt?: Date; endsAt?: Date; title?: string } = {},
): Promise<string> {
  const created = await repository.create({
    title: overrides.title ?? 'Обновление',
    body: 'Завтра с 9 до 11 продукт будет недоступен.',
    createdByUserId: author,
    ...overrides,
  });
  return created.id;
}

describe('activeFor — что мастер видит сейчас', () => {
  it('свежее объявление показывается', async () => {
    const author = await person('Администратор');
    await announce(author);

    expect(await repository.activeFor(await person())).toHaveLength(1);
  });

  it('прочитанное не возвращается', async () => {
    /* Отметка живёт на сервере: закрытое на телефоне не возвращается на
       ноутбуке. */
    const author = await person('Администратор');
    const id = await announce(author);
    const master = await person();

    await repository.dismiss(id, master);

    expect(await repository.activeFor(master)).toEqual([]);
  });

  it('прочитанное одним видно другому', async () => {
    const author = await person('Администратор');
    const id = await announce(author);
    const first = await person();
    const second = await person();
    await repository.dismiss(id, first);

    expect(await repository.activeFor(second)).toHaveLength(1);
  });

  it('повторное закрытие не ошибка', async () => {
    // Две вкладки закрывают одно и то же — вторая не должна получить 500.
    const author = await person('Администратор');
    const id = await announce(author);
    const master = await person();

    await repository.dismiss(id, master);
    await expect(repository.dismiss(id, master)).resolves.toBeUndefined();
  });

  it('объявление из будущего ещё не показывается', async () => {
    const author = await person('Администратор');
    await announce(author, { startsAt: new Date(Date.now() + 60 * 60 * 1000) });

    expect(await repository.activeFor(await person())).toEqual([]);
  });

  it('истёкшее исчезает само, без снятия руками', async () => {
    const author = await person('Администратор');
    await announce(author, {
      startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    expect(await repository.activeFor(await person())).toEqual([]);
  });

  it('снятое объявление не показывается', async () => {
    const author = await person('Администратор');
    const id = await announce(author);

    await repository.remove(id);

    expect(await repository.activeFor(await person())).toEqual([]);
  });
});

describe('list и remove — со стороны админки', () => {
  it('список несёт автора и число прочитавших', async () => {
    const author = await person('Алиса');
    const id = await announce(author);
    await repository.dismiss(id, await person());
    await repository.dismiss(id, await person());

    const [item] = (await repository.list({ limit: 100, offset: 0 })).items;

    expect(item?.authorName).toBe('Алиса');
    expect(item?.dismissedBy).toBe(2);
  });

  it('снятие мягкое: отметки «прочитано» остаются', async () => {
    /* Жёсткое удаление либо упало бы на внешнем ключе, либо унесло бы ответ
       на вопрос «сколько людей его видели». */
    const author = await person('Администратор');
    const id = await announce(author);
    await repository.dismiss(id, await person());

    await repository.remove(id);
    const [row] = await testDb().select().from(announcements).where(eq(announcements.id, id));

    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('снятое второй раз — null, а не ошибка', async () => {
    const author = await person('Администратор');
    const id = await announce(author);

    await repository.remove(id);

    expect(await repository.remove(id)).toBeNull();
  });

  it('снятые в списке админки не показываются', async () => {
    const author = await person('Администратор');
    await repository.remove(await announce(author));

    expect((await repository.list({ limit: 100, offset: 0 })).total).toBe(0);
  });
});
