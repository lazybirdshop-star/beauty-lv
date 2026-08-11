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
