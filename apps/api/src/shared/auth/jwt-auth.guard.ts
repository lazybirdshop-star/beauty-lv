import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AuthenticatedUser } from './current-user.decorator';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * decoded payload to `request.user`. Dev-mode simplification: a single
 * access token in the response body / localStorage, no refresh-token
 * rotation yet (see TASKS.md A-5) — the documented target is an httpOnly
 * refresh cookie per ARCHITECTURE.md §10.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = this.jwtService.verify<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
