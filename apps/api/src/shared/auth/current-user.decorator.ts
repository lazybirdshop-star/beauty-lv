import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  /**
   * Generation the token was signed under (`users.token_version`). Optional
   * because tokens issued before revocation existed carry no value —
   * `JwtAuthGuard` reads a missing one as the initial generation rather than
   * signing every current session out on deploy.
   */
  tv?: number;
}

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/** Reads the JWT payload attached by `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new Error('CurrentUser used outside of a JwtAuthGuard-protected route');
    }
    return request.user;
  },
);

/**
 * Личность на публичном маршруте: `null`, если её нет.
 *
 * Отдельный декоратор, а не послабление в `CurrentUser`: тот бросает, когда
 * охрана личность не поставила, и это правильно — молчаливый `undefined` в
 * защищённом маршруте означал бы, что данные отдаются неизвестно кому.
 * Здесь `null` — законный ответ, потому что маршрут открыт гостю.
 */
export const OptionalCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user ?? null;
  },
);
