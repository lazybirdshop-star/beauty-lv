import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  resolveRegistrationMode,
  normalizePhone,
  type RegistrationMode,
} from '@amolie/shared-kernel';
import * as argon2 from 'argon2';

import type { Env } from '../../../config/env.validation';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { RegistrationPushService } from '../../notifications/application/registration-push.service';
import {
  registrationApprovedLetter,
  registrationReceivedLetter,
  registrationRejectedLetter,
} from '../../notifications/application/letters';
import { resolveNotificationLocale } from '../../notifications/domain/notification-locale';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { PlatformSettingsRepository } from '../../platform-settings/infrastructure/platform-settings.repository';
import {
  MasterAccountRepository,
  type MasterAccountResult,
} from '../infrastructure/master-account.repository';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  locale: string;
  password: string;
  message?: string;
}

/**
 * Чем закончилась попытка зарегистрироваться.
 *
 * Ответ размечен режимом, а не угадывается по полям: экран регистрации
 * показывает совершенно разное — кабинет или «заявка отправлена», — и
 * различать эти два случая по наличию токена значило бы строить ветвление на
 * совпадении.
 */
export type RegistrationOutcome =
  { mode: 'open'; account: MasterAccountResult } | { mode: 'moderated'; requestId: string };

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private readonly appUrl: string;

  constructor(
    private readonly requests: RegistrationRequestsRepository,
    private readonly accounts: MasterAccountRepository,
    private readonly settings: PlatformSettingsRepository,
    private readonly push: RegistrationPushService,
    private readonly mail: ResendClient,
    private readonly auditLog: AuditLogRepository,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Как платформа впускает сегодня.
   *
   * Читается на каждый запрос, а не кешируется: переключение режима — редкое
   * событие, и оно обязано срабатывать сразу, а не после перезапуска.
   */
  async mode(): Promise<RegistrationMode> {
    const settings = await this.settings.getAll();
    return resolveRegistrationMode(settings.registration_mode);
  }

  /**
   * Регистрация: заявка или сразу аккаунт — решает режим платформы.
   *
   * Телефон приводится к канону тем же `normalizePhone`, что и телефоны
   * клиентов: «+371 26 12 34 56» и «+37126123456» — один и тот же человек.
   */
  async register(input: RegistrationInput): Promise<RegistrationOutcome> {
    const passwordHash = await argon2.hash(input.password);
    const phone = normalizePhone(input.phone);

    if ((await this.mode()) === 'open') {
      const account = await this.accounts.create({
        fullName: input.fullName,
        email: input.email,
        phone,
        locale: input.locale,
        passwordHash,
      });
      return { mode: 'open', account };
    }

    const request = await this.requests.submit({
      fullName: input.fullName,
      email: input.email,
      phone,
      locale: input.locale,
      passwordHash,
      message: input.message,
    });

    /* Ни push, ни письмо не могут отменить поданную заявку, поэтому оба
       уходят без ожидания: заявитель не должен стоять на экране, пока мы
       разговариваем с Apple и Resend. */
    void this.push.notifyNewRequest({ requestId: request.id, fullName: request.fullName });
    void this.sendLetter(request.email, () =>
      registrationReceivedLetter(resolveNotificationLocale(request.locale), request.fullName),
    );

    return { mode: 'moderated', requestId: request.id };
  }

  /**
   * Одобрение: заявка закрывается, аккаунт появляется.
   *
   * Порядок именно такой — сначала заявка берётся условным `UPDATE`, потом
   * заводится аккаунт. Обратный порядок при двойном нажатии дал бы два
   * аккаунта на один адрес, и второй упал бы уже на уникальном индексе, оставив
   * половину работы сделанной. Если аккаунт завести не вышло, заявка
   * возвращается в очередь — иначе человек не впущен, а очередь считает
   * вопрос закрытым.
   */
  async approve(requestId: string, adminUserId: string): Promise<MasterAccountResult> {
    const request = await this.requests.claimForApproval(requestId, adminUserId);
    if (!request) {
      throw new NotFoundException('Заявка не найдена или решение по ней уже принято');
    }
    if (!request.passwordHash) {
      await this.requests.releaseClaim(requestId);
      throw new ConflictException('Заявка повреждена: пароль не сохранён');
    }

    let account: MasterAccountResult;
    try {
      account = await this.accounts.create({
        fullName: request.fullName,
        email: request.email,
        phone: request.phone,
        locale: request.locale,
        passwordHash: request.passwordHash,
        /* Согласие дано при подаче, а не сейчас: одобрение — наше действие,
           а не его. */
        consentAt: request.createdAt,
      });
    } catch (error) {
      await this.requests.releaseClaim(requestId);
      throw error;
    }

    await this.requests.finishApproval(requestId, {
      userId: account.user.id,
      organizationId: account.organizationId,
    });

    await this.auditLog.record({
      actorUserId: adminUserId,
      action: 'registration_request.approved',
      entityType: 'registration_request',
      entityId: requestId,
      metadata: { createdUserId: account.user.id, slug: account.organizationSlug },
    });

    void this.sendLetter(request.email, () =>
      registrationApprovedLetter(
        resolveNotificationLocale(request.locale),
        request.fullName,
        `${this.appUrl}/login`,
      ),
    );

    return account;
  }

  /** Отказ с причиной. Причина уходит человеку письмом — молчание он читает как «меня проигнорировали». */
  async reject(requestId: string, adminUserId: string, reason: string): Promise<void> {
    const request = await this.requests.reject(requestId, adminUserId, reason);
    if (!request) {
      throw new NotFoundException('Заявка не найдена или решение по ней уже принято');
    }

    await this.auditLog.record({
      actorUserId: adminUserId,
      action: 'registration_request.rejected',
      entityType: 'registration_request',
      entityId: requestId,
    });

    void this.sendLetter(request.email, () =>
      registrationRejectedLetter(
        resolveNotificationLocale(request.locale),
        request.fullName,
        reason,
      ),
    );
  }

  /**
   * Письмо, которое не может уронить вызывающего.
   *
   * Заявка уже принята или решение уже записано; недоступный почтовый
   * провайдер не отменяет ни того, ни другого. В логе остаётся след, чтобы
   * молчание не было тихим.
   */
  private async sendLetter(
    to: string,
    compose: () => { subject: string; html: string; text: string },
  ): Promise<void> {
    try {
      await this.mail.send({ to, ...compose() });
    } catch (error) {
      this.logger.error(`Registration mail to ${to} failed: ${String(error)}`);
    }
  }
}
