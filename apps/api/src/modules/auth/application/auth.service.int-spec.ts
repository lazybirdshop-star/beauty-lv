import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';

import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { UsersRepository } from '../infrastructure/users.repository';
import { AuthService } from './auth.service';

/**
 * Смена пароля — против живого Postgres.
 *
 * Путь, который до сих пор не проверялся ничем, а решает три вещи сразу:
 * пароль меняется, все открытые сессии завершаются (поколение токенов
 * растёт), и событие остаётся в журнале — иначе на вопрос мастера «это точно
 * была я?» ответить нечем.
 */

let service: AuthService;
let auditLog: AuditLogRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  const db = testDb();
  auditLog = new AuditLogRepository(db);
  service = new AuthService(
    new UsersRepository(db),
    new JwtService({ secret: 'test-secret' }),
    auditLog,
  );
});

async function master(password: string): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({
      email: `master-${Math.random()}@example.com`,
      fullName: 'Мастер',
      systemRole: 'master',
      passwordHash: await argon2.hash(password),
    })
    .returning();
  return row!.id;
}

describe('changePassword', () => {
  it('меняет пароль на новый', async () => {
    const userId = await master('old-password-123');

    await service.changePassword(userId, 'old-password-123', 'new-password-456');
    const [row] = await testDb().select().from(users).where(eq(users.id, userId));

    await expect(argon2.verify(row!.passwordHash!, 'new-password-456')).resolves.toBe(true);
  });

  it('завершает открытые сессии, подняв поколение токенов', async () => {
    /* Ровно то, чего ждут от этой кнопки, когда пароль меняют не по своей
       воле: чужая вкладка перестаёт работать на первом же запросе. */
    const userId = await master('old-password-123');
    const [before] = await testDb().select().from(users).where(eq(users.id, userId));

    await service.changePassword(userId, 'old-password-123', 'new-password-456');
    const [after] = await testDb().select().from(users).where(eq(users.id, userId));

    expect(after!.tokenVersion).toBe(before!.tokenVersion + 1);
  });

  it('неверный текущий пароль ничего не меняет', async () => {
    const userId = await master('old-password-123');

    await expect(
      service.changePassword(userId, 'wrong-password', 'new-password-456'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const [row] = await testDb().select().from(users).where(eq(users.id, userId));

    await expect(argon2.verify(row!.passwordHash!, 'old-password-123')).resolves.toBe(true);
  });

  it('событие остаётся в журнале аккаунта', async () => {
    const userId = await master('old-password-123');

    await service.changePassword(userId, 'old-password-123', 'new-password-456');
    const entries = await auditLog.listForEntity(userId);

    expect(entries[0]?.action).toBe('user.password_changed');
    // Актор — сам владелец: пароль сменил он, а не панель.
    expect(entries[0]?.actorUserId).toBe(userId);
  });

  it('неудачная попытка в журнал не попадает', async () => {
    const userId = await master('old-password-123');

    await service
      .changePassword(userId, 'wrong-password', 'new-password-456')
      .catch(() => undefined);

    expect(await auditLog.listForEntity(userId)).toEqual([]);
  });
});
