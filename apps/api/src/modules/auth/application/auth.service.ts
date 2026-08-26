import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_ERROR_CODES } from '@amolie/shared-kernel';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

import type { UserRow } from '../../../shared/database/schema/users';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
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

/**
 * A hash to check a password against when no account matched.
 *
 * Verifying argon2 takes tens of milliseconds; returning early when the email
 * is unknown makes "no such user" measurably faster than "wrong password",
 * which turns the sign-in form into an account-existence oracle no matter how
 * carefully the two answers are worded the same. So the work is done either
 * way. Computed once, lazily, over a value nobody holds — the comparison can
 * only fail, and its cost is the point.
 */
let decoyHash: Promise<string> | undefined;

function decoyPasswordHash(): Promise<string> {
  decoyHash ??= argon2.hash(randomBytes(32).toString('hex'));
  return decoyHash;
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
 *
 * Регистрации здесь нет намеренно: кого впускать на платформу — вопрос
 * модуля `registration`, а этот отвечает за вход тех, кто уже впущен.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly auditLog: AuditLogRepository,
  ) {}

  /**
   * Failures carry a `code` beside the message: the sign-in screen renders
   * before anyone has a stored language, so it localises the reason itself and
   * cannot show whatever Russian sentence the server happened to write. The
   * message stays for logs and for any client that does not know the codes.
   */
  async validateCredentials(email: string, password: string): Promise<UserRow> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user || !user.passwordHash) {
      // Spend the same time as a real check would; see decoyPasswordHash.
      await argon2.verify(await decoyPasswordHash(), password).catch(() => false);
      throw new UnauthorizedException({
        message: 'Неверный email или пароль',
        code: AUTH_ERROR_CODES.invalidCredentials,
      });
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException({
        message: 'Неверный email или пароль',
        code: AUTH_ERROR_CODES.invalidCredentials,
      });
    }

    if (user.accountStatus === 'blocked') {
      throw new UnauthorizedException({
        message: 'Аккаунт заблокирован',
        code: AUTH_ERROR_CODES.accountBlocked,
      });
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
      // The generation this token belongs to; see users.tokenVersion.
      tv: user.tokenVersion,
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

    /* Смена пароля завершает все открытые сессии — событие, о котором мастер
       однажды спросит «это точно была я?». Ответ на такой вопрос должен
       где-то храниться. */
    await this.auditLog.record({
      actor: { sub: userId },
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
    });
  }
}
