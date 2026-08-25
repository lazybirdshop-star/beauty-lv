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
import { AccountDeletionRepository } from './account-deletion.repository';

/**
 * Удаление аккаунта — против живого Postgres.
 *
 * Проверяется главное обещание: за аккаунтом стоит салон и чужие люди,
 * записанные на четверг. Клиент, пришедший к закрытой двери, — не цена за
 * уборку данных, поэтому предстоящие визиты обязаны останавливать удаление.
 */

let repository: AccountDeletionRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new AccountDeletionRepository(testDb());
});

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

describe('что запрещает удаление', () => {
  it('несуществующий аккаунт', async () => {
    expect(await repository.deleteMaster('99999999-9999-4999-8999-999999999999')).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('администратора платформы удалить нельзя', async () => {
    const [admin] = await testDb()
      .insert(users)
      .values({
        email: 'admin@example.com',
        fullName: 'Администратор',
        systemRole: 'platform_admin',
      })
      .returning();

    expect(await repository.deleteMaster(admin!.id)).toEqual({ ok: false, reason: 'is-admin' });
  });

  it('предстоящий визит останавливает удаление и называет их число', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: FUTURE });

    expect(await repository.deleteMaster(org.userId)).toEqual({
      ok: false,
      reason: 'has-upcoming',
      blockers: { upcomingBookings: 1 },
    });
  });

  it('отменённый визит удалению не мешает', async () => {
    /* Отменённый визит никого не ждёт: клиент уже знает, что не придёт. */
    const org = await createOrg();
    await createBooking(org, { startsAt: FUTURE, status: 'cancelled_by_master' });

    expect(await repository.deleteMaster(org.userId)).toEqual({ ok: true });
  });

  it('прошедший визит удалению не мешает', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: PAST });

    expect(await repository.deleteMaster(org.userId)).toEqual({ ok: true });
  });
});

describe('что происходит при удалении', () => {
  it('личные данные обезличиваются, почта освобождается', async () => {
    /* Ради этого удаление и просят: имя, почта, телефон и аватар исчезают, а
       адрес снова доступен для регистрации. */
    const org = await createOrg();
    await testDb()
      .update(users)
      .set({ phone: '+37126000001', avatarUrl: 'https://example.com/a.jpg' })
      .where(eq(users.id, org.userId));

    await repository.deleteMaster(org.userId);
    const [row] = await testDb().select().from(users).where(eq(users.id, org.userId));

    expect(row).toMatchObject({
      fullName: 'Удалённый аккаунт',
      email: null,
      phone: null,
      avatarUrl: null,
      passwordHash: null,
    });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('открытые сессии завершаются немедленно', async () => {
    const org = await createOrg();
    const [before] = await testDb().select().from(users).where(eq(users.id, org.userId));

    await repository.deleteMaster(org.userId);
    const [after] = await testDb().select().from(users).where(eq(users.id, org.userId));

    expect(after!.tokenVersion).toBe(before!.tokenVersion + 1);
  });

  it('салон закрывается: страница перестаёт отвечать', async () => {
    const org = await createOrg();

    await repository.deleteMaster(org.userId);
    const [row] = await testDb()
      .select()
      .from(organizations)
      .where(eq(organizations.id, org.organizationId));

    expect(row?.status).toBe('archived');
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('членство в чужом салоне прекращается, а сам салон живёт', async () => {
    /* Салон коллеги продолжает работать без неё — удаление её аккаунта не
       закрывает чужое дело. */
    const own = await createOrg();
    const colleague = await createOrg();
    await testDb()
      .insert(organizationMembers)
      .values({ organizationId: colleague.organizationId, userId: own.userId, role: 'master' });

    await repository.deleteMaster(own.userId);
    const [row] = await testDb()
      .select()
      .from(organizations)
      .where(eq(organizations.id, colleague.organizationId));

    expect(row?.deletedAt).toBeNull();
  });

  it('удалённый аккаунт удалить второй раз нельзя', async () => {
    const org = await createOrg();
    await repository.deleteMaster(org.userId);

    expect(await repository.deleteMaster(org.userId)).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('exportAccount — покажите мои данные', () => {
  it('отдаёт аккаунт вместе с его салонами', async () => {
    const org = await createOrg();

    const data = (await repository.exportAccount(org.userId)) as {
      account: { fullName: string };
      organizations: { role: string }[];
    };

    expect(data.account.fullName).toBe('Мастер');
    expect(data.organizations[0]?.role).toBe('owner');
  });

  it('хеша пароля в выгрузке нет', async () => {
    const org = await createOrg();

    const data = (await repository.exportAccount(org.userId)) as { account: object };

    expect(data.account).not.toHaveProperty('passwordHash');
  });

  it('удалённый аккаунт не выгружается', async () => {
    const org = await createOrg();
    await repository.deleteMaster(org.userId);

    expect(await repository.exportAccount(org.userId)).toBeNull();
  });
});
