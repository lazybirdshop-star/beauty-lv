import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

import type { Database } from '../database/database.module';
import type { AuthenticatedUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';

interface AccountRow {
  accountStatus: string;
  tokenVersion: number;
  systemRole: string;
}

/**
 * Цепочка drizzle до `where` — последнее звено и отдаёт строки, поэтому
 * достаточно вернуть себя на каждом шаге и разрешиться найденным.
 */
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

const activeAccount: AccountRow = {
  accountStatus: 'active',
  tokenVersion: 0,
  systemRole: 'master',
};

describe('JwtAuthGuard — подпись необходима, но недостаточна', () => {
  it('требует заголовок', async () => {
    const guard = new JwtAuthGuard(jwtVerifying({} as AuthenticatedUser), dbReturning([]));
    const { context } = contextWith({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('не принимает схему, отличную от Bearer', async () => {
    const guard = new JwtAuthGuard(jwtVerifying({} as AuthenticatedUser), dbReturning([]));
    const { context } = contextWith({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('не принимает подделанную подпись', async () => {
    const guard = new JwtAuthGuard(jwtVerifying(new Error('invalid signature')), dbReturning([]));
    const { context } = contextWith({ authorization: 'Bearer forged' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('отказывает, когда аккаунта больше нет', async () => {
    // Строка не найдена — в том числе потому, что удалённые отсеяны в запросе.
    const guard = new JwtAuthGuard(
      jwtVerifying({ sub: USER_ID, email: 'a@b.c', role: 'master', tv: 0 }),
      dbReturning([]),
    );
    const { context } = contextWith({ authorization: 'Bearer valid' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('отказывает заблокированному, не дожидаясь истечения токена', async () => {
    // Ради этого запрос в базу и делается на каждом обращении: блокировка
    // должна действовать сразу, а не через оставшиеся 12 часов.
    const guard = new JwtAuthGuard(
      jwtVerifying({ sub: USER_ID, email: 'a@b.c', role: 'master', tv: 0 }),
      dbReturning([{ ...activeAccount, accountStatus: 'blocked' }]),
    );
    const { context } = contextWith({ authorization: 'Bearer valid' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('отказывает токену прошлого поколения', async () => {
    // Смена пароля повышает поколение — старые сессии кончаются.
    const guard = new JwtAuthGuard(
      jwtVerifying({ sub: USER_ID, email: 'a@b.c', role: 'master', tv: 0 }),
      dbReturning([{ ...activeAccount, tokenVersion: 1 }]),
    );
    const { context } = contextWith({ authorization: 'Bearer stale' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('читает токен без поколения как начальное', async () => {
    // Токены, выданные до появления отзыва, не должны разлогинить всех разом.
    const guard = new JwtAuthGuard(
      jwtVerifying({ sub: USER_ID, email: 'a@b.c', role: 'master' }),
      dbReturning([activeAccount]),
    );
    const { context } = contextWith({ authorization: 'Bearer legacy' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('берёт роль из строки, а не из полезной нагрузки', async () => {
    // Токен, подписанный до понижения, иначе сохранил бы прежние права —
    // а PermissionsGuard решает именно по этому полю.
    const guard = new JwtAuthGuard(
      jwtVerifying({ sub: USER_ID, email: 'a@b.c', role: 'platform_admin', tv: 0 }),
      dbReturning([{ ...activeAccount, systemRole: 'master' }]),
    );
    const { context, request } = contextWith({ authorization: 'Bearer demoted' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.role).toBe('master');
  });
});
