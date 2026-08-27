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
import { AdminRepository, LastAdminError } from './admin.repository';

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
  overrides: {
    role?: 'master' | 'client' | 'platform_admin';
    createdAt?: Date;
    deletedAt?: Date;
    fullName?: string;
    email?: string;
  } = {},
): Promise<string> {
  const [user] = await testDb()
    .insert(users)
    .values({
      email: overrides.email ?? `user-${Math.random()}@example.com`,
      fullName: overrides.fullName ?? 'Человек',
      systemRole: overrides.role ?? 'client',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
      ...(overrides.deletedAt ? { deletedAt: overrides.deletedAt } : {}),
    })
    .returning();
  return user!.id;
}

/** Страница целиком: почти каждый тест здесь смотрит на весь результат. */
const WHOLE_LIST = { limit: 100, offset: 0 };

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

    const { items: masters } = await repository.listMasters(WHOLE_LIST);

    expect(masters).toHaveLength(1);
    expect(masters[0]?.organizationSlug).toBeNull();
  });

  it('мастер с организацией приходит вместе с её адресом', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ systemRole: 'master' }).where(eq(users.id, org.userId));

    const {
      items: [master],
    } = await repository.listMasters(WHOLE_LIST);

    expect(master?.organizationSlug).toBeTruthy();
  });

  it('клиенты в список мастеров не попадают', async () => {
    await createUser({ role: 'client' });

    expect((await repository.listMasters(WHOLE_LIST)).items).toEqual([]);
  });

  it('новые мастера идут первыми', async () => {
    await createUser({ role: 'master', createdAt: new Date('2020-01-01T00:00:00.000Z') });
    await createUser({ role: 'master', createdAt: new Date('2026-01-01T00:00:00.000Z') });

    const { items: masters } = await repository.listMasters(WHOLE_LIST);

    expect(masters[0]!.createdAt.getTime()).toBeGreaterThan(masters[1]!.createdAt.getTime());
  });
});

describe('listMasters — одна строка на человека', () => {
  it('мастер двух салонов приходит одной строкой', async () => {
    /* Раньше список джойнил участников напрямую, и мастер, работающая в двух
       салонах, получала две карточки с двумя одинаковыми кнопками
       «Заблокировать». Для салонов это не редкость, а норма. */
    const first = await createOrg();
    const second = await createOrg();
    await testDb().update(users).set({ systemRole: 'master' }).where(eq(users.id, first.userId));
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: second.organizationId, userId: first.userId, role: 'master' });

    const { items, total } = await repository.listMasters(WHOLE_LIST);
    const rows = items.filter((master) => master.id === first.userId);

    expect(rows).toHaveLength(1);
    expect(total).toBe(items.length);
  });

  it('основной считается организация, которой мастер владеет', async () => {
    const owned = await createOrg();
    const employed = await createOrg();
    await testDb().update(users).set({ systemRole: 'master' }).where(eq(users.id, owned.userId));
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: employed.organizationId, userId: owned.userId, role: 'master' });

    const { items } = await repository.listMasters(WHOLE_LIST);
    const [organization] = await testDb()
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, owned.organizationId));

    expect(items.find((master) => master.id === owned.userId)?.organizationSlug).toBe(
      organization!.slug,
    );
  });

  it('удалённая организация адрес не даёт', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ systemRole: 'master' }).where(eq(users.id, org.userId));
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    const { items } = await repository.listMasters(WHOLE_LIST);

    expect(items[0]?.organizationSlug).toBeNull();
  });
});

describe('удалённые аккаунты', () => {
  it('в списке мастеров их нет', async () => {
    await createUser({ role: 'master', deletedAt: new Date() });

    expect((await repository.listMasters(WHOLE_LIST)).items).toEqual([]);
  });

  it('в списке пользователей их нет', async () => {
    await createUser({ deletedAt: new Date() });

    expect((await repository.listUsers(WHOLE_LIST)).items).toEqual([]);
  });

  it('в сводке они не считаются', async () => {
    /* Иначе число на главной расходится со списком под ней, и администратор
       перестаёт верить обоим. */
    await createUser({ role: 'master' });
    await createUser({ role: 'master', deletedAt: new Date() });

    expect((await repository.getDashboardSummary()).mastersCount).toBe(1);
  });

  it('заблокировать удалённого нельзя', async () => {
    const userId = await createUser({ deletedAt: new Date() });

    expect(await repository.setAccountStatus(userId, 'blocked')).toBeNull();
  });
});

describe('поиск и страницы', () => {
  it('поиск идёт по имени, почте и телефону', async () => {
    await createUser({ fullName: 'Алиса Озола', email: 'alisa@example.com' });
    await createUser({ fullName: 'Марис Берзиньш', email: 'maris@example.com' });

    const byName = await repository.listUsers({ ...WHOLE_LIST, query: 'озол' });
    const byEmail = await repository.listUsers({ ...WHOLE_LIST, query: 'MARIS@' });

    expect(byName.items).toHaveLength(1);
    expect(byEmail.items[0]?.fullName).toBe('Марис Берзиньш');
  });

  it('процент в запросе ищется как символ, а не как «что угодно»', async () => {
    /* Без экранирования поиск по «100%» вернул бы всю таблицу — и админ решил
       бы, что фильтр сломан. */
    await createUser({ fullName: 'Скидка 100% Мастер' });
    await createUser({ fullName: 'Обычный человек' });

    expect((await repository.listUsers({ ...WHOLE_LIST, query: '100%' })).items).toHaveLength(1);
  });

  it('total считает всех найденных, а не только страницу', async () => {
    await createUser({ role: 'master' });
    await createUser({ role: 'master' });
    await createUser({ role: 'master' });

    const page = await repository.listMasters({ limit: 2, offset: 0 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });

  it('сдвиг отдаёт следующую страницу, а не ту же', async () => {
    await createUser({ role: 'master', createdAt: new Date('2026-01-03T00:00:00.000Z') });
    await createUser({ role: 'master', createdAt: new Date('2026-01-02T00:00:00.000Z') });

    const first = await repository.listMasters({ limit: 1, offset: 0 });
    const second = await repository.listMasters({ limit: 1, offset: 1 });

    expect(first.items[0]?.id).not.toBe(second.items[0]?.id);
  });

  it('фильтр по роли и по статусу сужают список', async () => {
    const blocked = await createUser({ role: 'master' });
    await repository.setAccountStatus(blocked, 'blocked');
    await createUser({ role: 'master' });
    await createUser({ role: 'client' });

    expect((await repository.listUsers({ ...WHOLE_LIST, role: 'master' })).total).toBe(2);
    expect((await repository.listMasters({ ...WHOLE_LIST, status: 'blocked' })).total).toBe(1);
  });
});

describe('listUsers — пароли наружу не отдаются', () => {
  it('в ответе нет хеша пароля', async () => {
    /* Список читает админ платформы, но это не повод отдавать ему хеши: они
       не нужны ни одному экрану, а утечь могут через любой лог. */
    await createUser();

    const {
      items: [user],
    } = await repository.listUsers(WHOLE_LIST);

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

/**
 * Последний администратор платформы (FIX.md F-02).
 *
 * Единственное состояние продукта, из которого нет выхода через его же
 * интерфейс: без администратора заявки некому одобрять, а роль некому вернуть.
 * Ответ зависит от того, сколько строк видит транзакция, — мок здесь не
 * проверяет ничего.
 */
describe('setSystemRole — последний администратор', () => {
  it('роль последнего администратора не снимается', async () => {
    const adminId = await createUser({ role: 'platform_admin' });

    await expect(repository.setSystemRole(adminId, 'client')).rejects.toBeInstanceOf(
      LastAdminError,
    );

    const [row] = await testDb().select().from(users).where(eq(users.id, adminId));
    expect(row?.systemRole).toBe('platform_admin');
  });

  it('пока администраторов двое — разжаловать можно', async () => {
    const first = await createUser({ role: 'platform_admin' });
    await createUser({ role: 'platform_admin' });

    expect((await repository.setSystemRole(first, 'client'))?.systemRole).toBe('client');
  });

  it('удалённый администратор в счёт не идёт', async () => {
    const adminId = await createUser({ role: 'platform_admin' });
    await createUser({ role: 'platform_admin', deletedAt: new Date() });

    // Аккаунт с `deleted_at` войти не может — оставшийся администратор один.
    await expect(repository.setSystemRole(adminId, 'client')).rejects.toBeInstanceOf(
      LastAdminError,
    );
  });

  it('назначение администратора никогда не блокируется', async () => {
    const userId = await createUser({ role: 'client' });

    // Проверка о снятии роли, а не о выдаче: платформа без администратора —
    // тупик, платформа с двумя — обычное состояние.
    expect((await repository.setSystemRole(userId, 'platform_admin'))?.systemRole).toBe(
      'platform_admin',
    );
  });

  it('роль не-администратора правится и когда админ один', async () => {
    await createUser({ role: 'platform_admin' });
    const userId = await createUser({ role: 'client' });

    expect((await repository.setSystemRole(userId, 'master'))?.systemRole).toBe('master');
  });
});
