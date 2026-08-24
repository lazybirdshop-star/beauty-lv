import { eq } from 'drizzle-orm';

import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg } from '../../../testing/factories';
import { AdminRepository } from './admin.repository';

/**
 * Админ-панель платформы — против живого Postgres.
 *
 * Здесь два запроса, которые типы не проверяют: недельные тренды собираются
 * `to_char(date_trunc('week', …))` с группировкой по номеру столбца, а список
 * мастеров идёт двумя `LEFT JOIN` подряд. И то и другое либо исполняется базой,
 * либо роняет админку целиком — промежуточного состояния нет.
 *
 * Отдельно проверяется, что мастер **без организации** из списка не исчезает:
 * `LEFT JOIN`, случайно ставший `INNER`, прячет ровно тех, кто зарегистрировался
 * и ещё не завёл салон, — то есть тех, ради кого админка и открывается.
 */

let repository: AdminRepository;

async function createUser(
  overrides: { role?: 'master' | 'client' | 'platform_admin'; createdAt?: Date } = {},
): Promise<string> {
  const [user] = await testDb()
    .insert(users)
    .values({
      email: `user-${Math.random()}@example.com`,
      fullName: 'Человек',
      systemRole: overrides.role ?? 'client',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning();
  return user!.id;
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new AdminRepository(testDb());
});

describe('getDashboardSummary — сводка платформы', () => {
  it('на пустой платформе отвечает нулями, а не падает', async () => {
    const summary = await repository.getDashboardSummary();

    expect(summary.mastersCount).toBe(0);
    expect(summary.bookingsCount).toBe(0);
  });

  it('считает мастеров и клиентов раздельно', async () => {
    await createUser({ role: 'master' });
    await createUser({ role: 'master' });
    await createUser({ role: 'client' });

    const summary = await repository.getDashboardSummary();

    expect(summary.mastersCount).toBe(2);
    expect(summary.clientsCount).toBe(1);
  });

  it('свежие регистрации — те, что за последнюю неделю', async () => {
    await createUser({ createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
    await createUser({ createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });

    expect((await repository.getDashboardSummary()).newRegistrationsLast7Days).toBe(1);
  });

  it('считает записи по всей платформе', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    expect((await repository.getDashboardSummary()).bookingsCount).toBe(1);
  });
});

describe('getWeeklyTrends — недельные тренды', () => {
  it('запрос исполняется на пустой платформе', async () => {
    /* `date_trunc('week', …)` с группировкой по номеру столбца — ровно тот
       вид запроса, на котором продукт уже один раз лёг. */
    const trends = await repository.getWeeklyTrends();

    expect(trends.registrations).toEqual([]);
    expect(trends.bookings).toEqual([]);
  });

  it('регистрации собираются в недели', async () => {
    await createUser();
    await createUser();

    const trends = await repository.getWeeklyTrends();

    // Оба созданы сейчас, значит одна неделя и двое в ней.
    expect(trends.registrations).toHaveLength(1);
    expect(trends.registrations[0]?.value).toBe(2);
  });

  it('старше окна не попадает', async () => {
    await createUser({ createdAt: new Date('2020-01-01T00:00:00.000Z') });

    expect(await repository.getWeeklyTrends()).toEqual({ registrations: [], bookings: [] });
  });

  it('неделя приходит датой понедельника в разбираемом виде', async () => {
    await createUser();

    const [week] = (await repository.getWeeklyTrends()).registrations;

    // График рисуется по этой строке; «YYYY-MM-DD» сортируется как дата.
    expect(week?.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('записи и регистрации — два независимых ряда', async () => {
    /* Намеренно не один график с двумя шкалами: несвязанные величины на общей
       оси выглядят коррелирующими. */
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const trends = await repository.getWeeklyTrends();

    expect(trends.bookings).toHaveLength(1);
    // `createOrg` завела владельца — регистрация тоже есть, но это свой ряд.
    expect(trends.registrations).toHaveLength(1);
  });
});

describe('listMasters — список мастеров', () => {
  it('мастер без организации из списка не исчезает', async () => {
    /* `LEFT JOIN`, случайно ставший `INNER`, спрятал бы ровно тех, кто
       зарегистрировался и ещё не завёл салон. */
    await createUser({ role: 'master' });

    const masters = await repository.listMasters();

    expect(masters).toHaveLength(1);
    expect(masters[0]?.organizationSlug).toBeNull();
  });

  it('мастер с организацией приходит вместе с её адресом', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ systemRole: 'master' }).where(eq(users.id, org.userId));

    const [master] = await repository.listMasters();

    expect(master?.organizationSlug).toBeTruthy();
  });

  it('клиенты в список мастеров не попадают', async () => {
    await createUser({ role: 'client' });

    expect(await repository.listMasters()).toEqual([]);
  });

  it('новые мастера идут первыми', async () => {
    await createUser({ role: 'master', createdAt: new Date('2020-01-01T00:00:00.000Z') });
    await createUser({ role: 'master', createdAt: new Date('2026-01-01T00:00:00.000Z') });

    const masters = await repository.listMasters();

    expect(masters[0]!.createdAt.getTime()).toBeGreaterThan(masters[1]!.createdAt.getTime());
  });
});

describe('listUsers — пароли наружу не отдаются', () => {
  it('в ответе нет хеша пароля', async () => {
    /* Список читает админ платформы, но это не повод отдавать ему хеши: они
       не нужны ни одному экрану, а утечь могут через любой лог. */
    await createUser();

    const [user] = await repository.listUsers();

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('tokenVersion');
  });
});

describe('setSystemRole и setAccountStatus', () => {
  it('роль меняется и возвращается новая', async () => {
    const userId = await createUser({ role: 'client' });

    const updated = await repository.setSystemRole(userId, 'master');

    expect(updated?.systemRole).toBe('master');
  });

  it('несуществующий пользователь — ничего, а не ошибка', async () => {
    expect(
      await repository.setSystemRole('99999999-9999-4999-8999-999999999999', 'master'),
    ).toBeNull();
  });

  it('блокировка аккаунта возвращает новое состояние', async () => {
    const userId = await createUser();

    expect((await repository.setAccountStatus(userId, 'blocked'))?.accountStatus).toBe('blocked');
  });

  it('ответ смены роли тоже не несёт хеша пароля', async () => {
    const userId = await createUser();

    const updated = await repository.setSystemRole(userId, 'master');

    expect(updated).not.toHaveProperty('passwordHash');
  });
});
