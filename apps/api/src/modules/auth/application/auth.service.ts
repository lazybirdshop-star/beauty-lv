import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { UserRow } from '../../../shared/database/schema/users';
import { UsersRepository } from '../infrastructure/users.repository';

export interface LoginResult {
  accessToken: string;
  user: { id: string; fullName: string; email: string | null; role: string };
  organizations: { organizationId: string; slug: string; name: string; role: string }[];
  redirectUrl: string | null;
}

/**
 * Dev-mode simplification (see shared/auth/shared-auth.module.ts): one
 * access token, no refresh rotation yet. Redirect logic matches
 * ARCHITECTURE.md §3.6 — platform_admin goes to /admin, a master with an
 * organization goes to their subdomain-stand-in dashboard.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<UserRow> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return user;
  }

  async login(user: UserRow): Promise<LoginResult> {
    const memberships = await this.usersRepository.findMemberships(user.id);
    const primaryOrg = memberships[0];

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.systemRole,
    });

    const redirectUrl =
      user.systemRole === 'platform_admin'
        ? '/admin'
        : primaryOrg
          ? `/${primaryOrg.slug}/dashboard`
          : null;

    return {
      accessToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.systemRole },
      organizations: memberships,
      redirectUrl,
    };
  }

  async me(userId: string): Promise<Omit<LoginResult, 'accessToken'> | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user) return null;

    const memberships = await this.usersRepository.findMemberships(user.id);
    const primaryOrg = memberships[0];
    const redirectUrl =
      user.systemRole === 'platform_admin'
        ? '/admin'
        : primaryOrg
          ? `/${primaryOrg.slug}/dashboard`
          : null;

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.systemRole },
      organizations: memberships,
      redirectUrl,
    };
  }
}
