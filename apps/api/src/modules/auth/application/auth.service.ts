import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { normalizeInviteCode } from '@amolie/shared-kernel';
import * as argon2 from 'argon2';

import type { UserRow } from '../../../shared/database/schema/users';
import { RegistrationRepository } from '../infrastructure/registration.repository';
import { UsersRepository } from '../infrastructure/users.repository';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    locale: string;
    smsRemindersEnabled: boolean;
    emailRemindersEnabled: boolean;
    role: string;
  };
  organizations: { organizationId: string; slug: string; name: string; role: string }[];
  redirectUrl: string | null;
}

function toUserSummary(user: UserRow): LoginResult['user'] {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    locale: user.locale,
    smsRemindersEnabled: user.smsRemindersEnabled,
    emailRemindersEnabled: user.emailRemindersEnabled,
    role: user.systemRole,
  };
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
    private readonly registrationRepository: RegistrationRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Closed registration (ARCHITECTURE.md §10.1): a valid invite code is the
   * only way in. The account, organization and membership are created
   * together with the code redemption — see RegistrationRepository.
   */
  async register(input: {
    code: string;
    fullName: string;
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const passwordHash = await argon2.hash(input.password);
    const { user } = await this.registrationRepository.register({
      code: normalizeInviteCode(input.code),
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    });
    return this.login(user);
  }

  async validateCredentials(email: string, password: string): Promise<UserRow> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.accountStatus === 'blocked') {
      throw new UnauthorizedException('Аккаунт заблокирован');
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
      user: toUserSummary(user),
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
      user: toUserSummary(user),
      organizations: memberships,
      redirectUrl,
    };
  }

  async updateProfile(
    userId: string,
    input: Parameters<UsersRepository['updateProfile']>[1],
  ): Promise<LoginResult['user']> {
    const user = await this.usersRepository.updateProfile(userId, input);
    return toUserSummary(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const currentValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!currentValid) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }

    const newHash = await argon2.hash(newPassword);
    await this.usersRepository.updatePassword(userId, newHash);
  }
}
