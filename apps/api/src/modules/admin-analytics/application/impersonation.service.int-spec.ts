import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';

import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg } from '../../../testing/factories';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { ImpersonationService } from './impersonation.service';

/**
 * Вход в чужой кабинет — самая опасная возможность панели.
 *
 * Здесь закреплены все три ограничителя: в администратора войти нельзя,
 * токен помечен и живёт полчаса, каждый вход попадает в журнал. Тест на
 * «нельзя войти в администратора» — не педантизм: без него один
 * администратор получает права другого, и разделение ролей внутри платформы
 * перестаёт что-либо значить.
 */

const SECRET = 'test-secret-for-impersonation';

let service: ImpersonationService;
let jwt: JwtService;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: '12h' } });
  service = new ImpersonationService(testDb(), jwt, new AuditLogRepository(testDb()));
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

describe('impersonate — кого пускать нельзя', () => {
  it('несуществующего мастера — 404', async () => {
    await expect(
      service.impersonate('99999999-9999-4999-8999-999999999999', await admin()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('в администратора платформы войти нельзя', async () => {
    const target = await admin();

    await expect(service.impersonate(target, await admin())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('в заблокированный аккаунт — тоже нельзя', async () => {
    /* Такой токен всё равно отвергнет охрана на первом запросе: честнее
       сказать это сразу, чем выдать ключ от закрытой двери. */
    const org = await createOrg();
    await testDb().update(users).set({ accountStatus: 'blocked' }).where(eq(users.id, org.userId));

    await expect(service.impersonate(org.userId, await admin())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('удалённый аккаунт не находится', async () => {
    const org = await createOrg();
    await testDb().update(users).set({ deletedAt: new Date() }).where(eq(users.id, org.userId));

    await expect(service.impersonate(org.userId, await admin())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('impersonate — выданный токен', () => {
  it('подписан на мастера и помечен тем, кто вошёл', async () => {
    const org = await createOrg();
    const adminId = await admin();

    const { accessToken } = await service.impersonate(org.userId, adminId);
    const payload = jwt.verify<{ sub: string; imp: string; role: string }>(accessToken);

    expect(payload.sub).toBe(org.userId);
    expect(payload.imp).toBe(adminId);
    expect(payload.role).toBe('client');
  });

  it('живёт полчаса, а не двенадцать часов', async () => {
    const org = await createOrg();

    const { accessToken } = await service.impersonate(org.userId, await admin());
    const payload = jwt.verify<{ exp: number; iat: number }>(accessToken);

    expect(payload.exp - payload.iat).toBe(30 * 60);
  });

  it('несёт поколение токенов мастера', async () => {
    /* Иначе смена пароля мастером не завершила бы сессию поддержки. */
    const org = await createOrg();
    await testDb().update(users).set({ tokenVersion: 7 }).where(eq(users.id, org.userId));

    const { accessToken } = await service.impersonate(org.userId, await admin());

    expect(jwt.verify<{ tv: number }>(accessToken).tv).toBe(7);
  });

  it('ведёт в кабинет её салона', async () => {
    const org = await createOrg();

    const result = await service.impersonate(org.userId, await admin());

    expect(result.redirectUrl).toMatch(/^\/salon-.*\/dashboard$/);
  });

  it('мастер без салона тоже пускается — ради этого и заходят', async () => {
    const [master] = await testDb()
      .insert(users)
      .values({ email: 'lonely@example.com', fullName: 'Без салона', systemRole: 'master' })
      .returning();

    expect((await service.impersonate(master!.id, await admin())).redirectUrl).toBe('/');
  });

  it('каждый вход остаётся в журнале', async () => {
    // «Кто открывал мой кабинет» — вопрос, на который обязан быть ответ.
    const org = await createOrg();
    const adminId = await admin();

    await service.impersonate(org.userId, adminId);
    const entries = await new AuditLogRepository(testDb()).listForEntity(org.userId);

    expect(entries[0]?.action).toBe('user.impersonated');
    expect(entries[0]?.actorUserId).toBe(adminId);
  });
});
