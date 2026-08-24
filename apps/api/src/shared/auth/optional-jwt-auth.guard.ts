import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { DRIZZLE, type Database } from '../database/database.module';
import { bearerToken, verifyAccessToken } from './access-token';
import type { AuthenticatedUser } from './current-user.decorator';

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Охрана публичного маршрута, которому важно, кто пришёл, но не важно,
 * пришёл ли кто-то вообще.
 *
 * Пропускает всегда. Действительный токен становится `request.user`,
 * недействительный — не становится ничем.
 *
 * **Просроченный токен здесь — гость, а не 401.** Кука живёт двенадцать
 * часов, а маршрут, ради которого эта охрана написана, — гостевая запись.
 * Отвечать отказом на вчерашнюю сессию значило бы не пускать человека
 * записаться вовсе, причём без объяснимой ему причины: маршрут открыт всем,
 * и отвергнутый токен ничего не защищает — он только отнимает то, что и так
 * разрешено. Кто именно пришёл, решает `verifyAccessToken`, и решает так же
 * строго, как для кабинета: подделанная подпись, заблокированный аккаунт и
 * отозванная сессия личностью не становятся.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithOptionalUser>();
    const verdict = await verifyAccessToken(this.jwtService, this.db, bearerToken(request));

    if (verdict.ok) request.user = verdict.user;
    return true;
  }
}
