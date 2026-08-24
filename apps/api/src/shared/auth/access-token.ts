import type { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import type { Request } from 'express';

import type { Database } from '../database/database.module';
import { users } from '../database/schema/users';
import type { AuthenticatedUser } from './current-user.decorator';

/** Почему предъявленный токен не стал личностью. */
export type AccessTokenRejection = 'missing' | 'invalid' | 'inactive' | 'revoked';

export type AccessTokenVerdict =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: AccessTokenRejection };

/** `Authorization: Bearer <token>` — или ничего, если схема другая. */
export function bearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

/**
 * Проверка токена, одна на все маршруты продукта.
 *
 * Вынесена из `JwtAuthGuard` в общую функцию, когда охран стало две:
 * защищённая (`JwtAuthGuard`) и необязательная (`OptionalJwtAuthGuard`).
 * Двух копий этой проверки быть не должно — следующая правка отзыва доступа
 * попала бы в одну из них, и публичный маршрут остался бы со старым
 * правилом.
 *
 * Отвечает вердиктом, а не исключением: что делать с отказом — вопрос
 * охраны. Защищённому маршруту отказ означает 401, публичному — «гость».
 *
 * Подпись необходима, но недостаточна: всё, что отнимает доступ, происходит
 * **после** выдачи токена (аккаунт заблокировали, удалили, сменили пароль).
 * Самодостаточный JWT об этом не знает, поэтому строка перечитывается на
 * каждом запросе.
 */
export async function verifyAccessToken(
  jwtService: JwtService,
  db: Database,
  token: string | undefined,
): Promise<AccessTokenVerdict> {
  if (!token) return { ok: false, reason: 'missing' };

  let payload: AuthenticatedUser;
  try {
    payload = jwtService.verify<AuthenticatedUser>(token);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const [account] = await db
    .select({
      accountStatus: users.accountStatus,
      tokenVersion: users.tokenVersion,
      systemRole: users.systemRole,
    })
    .from(users)
    .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

  if (!account || account.accountStatus !== 'active') {
    return { ok: false, reason: 'inactive' };
  }

  // Токены, выпущенные до появления отзыва, поколения не несут; начальное — 0.
  if ((payload.tv ?? 0) !== account.tokenVersion) {
    return { ok: false, reason: 'revoked' };
  }

  /* Роль — из строки, а не из полезной нагрузки. Токен, подписанный до
     понижения в правах, иначе сохранил бы права, с которыми был выпущен, —
     а `PermissionsGuard` решает ровно по этому полю. */
  return { ok: true, user: { ...payload, role: account.systemRole } };
}
