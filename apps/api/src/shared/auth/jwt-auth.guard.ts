import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { DRIZZLE, type Database } from '../database/database.module';
import { bearerToken, verifyAccessToken, type AccessTokenRejection } from './access-token';
import type { AuthenticatedUser } from './current-user.decorator';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/** Отказ — словами, по которым видно, что именно не так, в логах и в тестах. */
const REJECTION_MESSAGE: Record<AccessTokenRejection, string> = {
  missing: 'Missing bearer token',
  invalid: 'Invalid or expired token',
  inactive: 'Account is no longer active',
  revoked: 'Session has been revoked',
};

/**
 * Требует действительный токен и кладёт его личность в `request.user`.
 *
 * Сама проверка живёт в `verifyAccessToken` — она общая с
 * `OptionalJwtAuthGuard`, и раздваивать её нельзя (см. комментарий там).
 * Здесь остаётся одно решение, ради которого охрана и существует: любой
 * отказ — это 401.
 *
 * Цена — один поиск по первичному ключу на каждый аутентифицированный
 * запрос. Осознанный размен: правильность отзыва доступа против экономии
 * запроса на масштабе этого продукта. Когда приедет A-5, короткоживущие
 * токены позволят проверять это при обновлении, а не на каждом запросе.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const verdict = await verifyAccessToken(this.jwtService, this.db, bearerToken(request));

    if (!verdict.ok) {
      throw new UnauthorizedException(REJECTION_MESSAGE[verdict.reason]);
    }

    request.user = verdict.user;
    return true;
  }
}
