import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

import type { Database } from '../database/database.module';
import type { AuthenticatedUser } from './current-user.decorator';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';

interface AccountRow {
  accountStatus: string;
  tokenVersion: number;
  systemRole: string;
}

function dbReturning(rows: AccountRow[]): Database {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => Promise.resolve(rows),
  };
  return chain as unknown as Database;
}

function contextWith(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; user?: AuthenticatedUser } = { headers };
  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
    request,
  };
}

function jwtVerifying(payload: AuthenticatedUser | Error): JwtService {
  return {
    verify: () => {
      if (payload instanceof Error) throw payload;
      return payload;
    },
  } as unknown as JwtService;
}

const clientPayload = { sub: USER_ID, email: 'anna@example.com', role: 'client' };
const activeClient: AccountRow = {
  accountStatus: 'active',
  tokenVersion: 0,
  systemRole: 'client',
};

/**
 * Охрана публичного маршрута. Всё, что она решает, — узнан пришедший или нет;
 * не пустить она не может ни при каких обстоятельствах, иначе публичная
 * страница перестанет быть публичной.
 */
describe('OptionalJwtAuthGuard', () => {
  it('пропускает гостя без заголовка', async () => {
    const guard = new OptionalJwtAuthGuard(jwtVerifying(new Error('unused')), dbReturning([]));
    const { context, request } = contextWith({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('узнаёт вошедшего клиента', async () => {
    const guard = new OptionalJwtAuthGuard(
      jwtVerifying(clientPayload),
      dbReturning([activeClient]),
    );
    const { context, request } = contextWith({ authorization: 'Bearer token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.sub).toBe(USER_ID);
  });

  /* Кука живёт двенадцать часов. Отвечать отказом на вчерашнюю сессию значит
     не пустить человека записаться вовсе — на маршруте, который и так открыт
     каждому. */
  it('вчерашнюю сессию считает гостем, а не отказом', async () => {
    const guard = new OptionalJwtAuthGuard(
      jwtVerifying(new Error('jwt expired')),
      dbReturning([activeClient]),
    );
    const { context, request } = contextWith({ authorization: 'Bearer stale' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('заблокированный аккаунт личностью не становится', async () => {
    const guard = new OptionalJwtAuthGuard(
      jwtVerifying(clientPayload),
      dbReturning([{ ...activeClient, accountStatus: 'blocked' }]),
    );
    const { context, request } = contextWith({ authorization: 'Bearer token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('отозванную сессию не признаёт', async () => {
    const guard = new OptionalJwtAuthGuard(
      jwtVerifying({ ...clientPayload, tv: 1 }),
      dbReturning([activeClient]),
    );
    const { context, request } = contextWith({ authorization: 'Bearer token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});
