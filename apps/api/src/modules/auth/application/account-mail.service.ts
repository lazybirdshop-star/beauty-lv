import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import type { Env } from '../../../config/env.validation';
import {
  passwordResetLetter,
  verifyEmailLetter,
  welcomeLetter,
} from '../../notifications/application/letters';
import { resolveNotificationLocale } from '../../notifications/domain/notification-locale';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { UserTokensRepository } from '../infrastructure/user-tokens.repository';
import { UsersRepository } from '../infrastructure/users.repository';

/** Сутки на подтверждение адреса: письмо могут открыть вечером следующего дня. */
const VERIFY_TTL_MINUTES = 24 * 60;
/** Час на сброс пароля: короткое окно у ключа, открывающего аккаунт. */
const RESET_TTL_MINUTES = 60;

/**
 * Письма, которые касаются самого аккаунта: приветствие, подтверждение адреса
 * и восстановление пароля.
 *
 * Отдельно от `AuthService` намеренно: тот отвечает за вход и учётные данные,
 * и подмешивать в него доставку писем значило бы связать проверку пароля с
 * доступностью почтового провайдера.
 */
@Injectable()
export class AccountMailService {
  private readonly logger = new Logger(AccountMailService.name);
  private readonly appUrl: string;

  constructor(
    private readonly tokens: UserTokensRepository,
    private readonly users: UsersRepository,
    private readonly mail: ResendClient,
    private readonly auditLog: AuditLogRepository,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Приветствие и ссылка активации — одним действием после регистрации.
   *
   * Ошибки проглатываются осознанно: мастер уже зарегистрирована и уже вошла,
   * и падать на этом шаге значило бы отменить успешную регистрацию из-за
   * чужого сервиса. Непосланное письмо она восстановит кнопкой «забыли
   * пароль», а в логе останется след.
   */
  async sendWelcome(user: { id: string; email: string | null; fullName: string; locale: string }) {
    if (!user.email) return;

    try {
      const locale = resolveNotificationLocale(user.locale);
      const token = await this.tokens.issue(user.id, 'email_verification', VERIFY_TTL_MINUTES);

      await this.mail.send({
        to: user.email,
        ...welcomeLetter(locale, user.fullName, `${this.appUrl}/login`),
      });
      await this.mail.send({
        to: user.email,
        ...verifyEmailLetter(locale, `${this.appUrl}/verify-email?token=${token}`),
      });
    } catch (error) {
      this.logger.error(`Welcome mail failed for user ${user.id}: ${String(error)}`);
    }
  }

  /**
   * Запрос на восстановление пароля.
   *
   * Ничего не возвращает и никогда не сообщает, нашёлся ли адрес: иначе форма
   * превращается в проверялку «есть ли у вас аккаунт», а список клиентов
   * мастера — не то, о чём стоит рассказывать по одному запросу.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user?.email || user.accountStatus === 'blocked') return;

    const token = await this.tokens.issue(user.id, 'password_reset', RESET_TTL_MINUTES);

    await this.mail.send({
      to: user.email,
      ...passwordResetLetter(
        resolveNotificationLocale(user.locale),
        `${this.appUrl}/reset-password?token=${token}`,
      ),
    });
  }

  /** Возвращает `false`, если ссылка неизвестна, протухла или уже сработала. */
  async resetPassword(token: string, password: string): Promise<boolean> {
    const row = await this.tokens.consume(token, 'password_reset');
    if (!row) return false;

    /* `updatePassword` поднимает `tokenVersion`, поэтому сброс пароля
       завершает все открытые сессии — ровно то, чего ждут от этой кнопки,
       когда пароль меняют не по своей воле. */
    await this.users.updatePassword(row.userId, await argon2.hash(password));

    /* Сам себе актор: пароль сменил владелец аккаунта по ссылке из письма, а
       не администратор. Без этой записи карточка мастера отвечает на вопрос
       «что происходило с аккаунтом» только про действия панели — то есть
       молчит ровно о том, что чаще всего и разбирают. */
    await this.auditLog.record({
      actorUserId: row.userId,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: row.userId,
    });

    return true;
  }

  /** Подтверждение адреса. `false` — ссылка недействительна. */
  async verifyEmail(token: string): Promise<boolean> {
    const row = await this.tokens.consume(token, 'email_verification');
    if (!row) return false;

    await this.users.markEmailVerified(row.userId);

    await this.auditLog.record({
      actorUserId: row.userId,
      action: 'user.email_verified',
      entityType: 'user',
      entityId: row.userId,
    });
    return true;
  }
}
