import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import type { Request } from 'express';

import { DRIZZLE, type Database } from '../database/database.module';
import { users } from '../database/schema/users';
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
 *
 * A valid signature is necessary but not sufficient. The account is
 * re-checked against the database on every request, because everything that
 * withdraws access happens *after* the token was handed out: an admin blocks
 * the master (TASKS.md AP-3), the account is deleted, the password is
 * changed because it leaked. A self-contained JWT knows none of that, so
 * without this lookup a blocked account would keep working for the rest of
 * the token's 12 hours — which is the whole point of blocking it.
 *
 * The cost is one primary-key lookup per authenticated request. That is the
 * deliberate trade: correctness of revocation over saving a query at this
 * product's scale. When A-5 lands, short-lived access tokens will make this
 * checkable at refresh time instead of per request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AuthenticatedUser;
    try {
      payload = this.jwtService.verify<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const [account] = await this.db
      .select({
        accountStatus: users.accountStatus,
        tokenVersion: users.tokenVersion,
        systemRole: users.systemRole,
      })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

    if (!account || account.accountStatus !== 'active') {
      throw new UnauthorizedException('Account is no longer active');
    }

    // Tokens predating revocation carry no generation; the initial one is 0.
    if ((payload.tv ?? 0) !== account.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }

    /* The role comes from the row, not from the payload. A token signed
       before a demotion would otherwise keep the privileges it was minted
       with — and `PermissionsGuard` decides on exactly this field. */
    request.user = { ...payload, role: account.systemRole };
    return true;
  }
}
