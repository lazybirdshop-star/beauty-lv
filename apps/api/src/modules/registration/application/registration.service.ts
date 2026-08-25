import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DASHBOARD_ERROR_CODES,
  resolveRegistrationMode,
  normalizePhone,
  type RegistrationMode,
} from '@amolie/shared-kernel';
import * as argon2 from 'argon2';

import type { Env } from '../../../config/env.validation';
import type { RegistrationRequestRow } from '../../../shared/database/schema/registration-requests';
import type { UserRow } from '../../../shared/database/schema/users';
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
import { AccountUpgradeService } from './account-upgrade.service';

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

/**
 * Чем закончилось одобрение.
 *
 * Тоже размечено режимом: кабинет либо есть, либо появится после того, как
 * человек откроет письмо. Администратору эти два исхода нужно показать
 * по-разному — во втором случае ждать ответа ещё и ему.
 */
export type ApprovalOutcome =
  | { mode: 'created'; account: MasterAccountResult }
  /** Адрес занят клиентским аккаунтом: подтверждение ушло на него. */
  | { mode: 'confirmation-sent'; email: string; userId: string };

/**
 * Заявка, из которой ещё можно что-то сделать.
 *
 * Предикат, а не проверка на месте: без пароля заводить нечего, и знание об
 * этом должно доезжать до типов — иначе `passwordHash` приходится подпирать
 * восклицательным знаком в каждой второй строке.
 */
function hasPassword(
  request: RegistrationRequestRow,
): request is RegistrationRequestRow & { passwordHash: string } {
  return request.passwordHash !== null;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private readonly appUrl: string;

  constructor(
    private readonly requests: RegistrationRequestsRepository,
    private readonly accounts: MasterAccountRepository,
    private readonly settings: PlatformSettingsRepository,
    private readonly upgrades: AccountUpgradeService,
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
   *
   * Адрес, за которым уже стоит аккаунт клиента, ведёт не к отказу, а к
   * повышению: второго аккаунта на ту же почту не бывает, а человек — тот же,
   * и его записи должны остаться при нём. Кабинет в этом случае открывается не
   * сейчас, а когда он подтвердит переход по ссылке из письма (см.
   * `AccountUpgradeService`).
   */
  async approve(requestId: string, adminUserId: string): Promise<ApprovalOutcome> {
    const request = await this.requests.claimForApproval(requestId, adminUserId);
    if (!request) {
      throw new NotFoundException({
        message: 'Заявка не найдена или решение по ней уже принято',
        code: DASHBOARD_ERROR_CODES.registrationRequestDecided,
      });
    }
    if (!hasPassword(request)) {
      await this.requests.releaseClaim(requestId);
      throw new ConflictException('Заявка повреждена: пароль не сохранён');
    }

    const occupant = await this.accounts.findLiveByEmail(request.email);

    /* Всё, что может не получиться, происходит внутри: любой отказ возвращает
       заявку в очередь одинаково, потому что «одобрена, но ничего не
       произошло» — это заявка, потерянная из работы. */
    const outcome = await this.attempt(request, occupant).catch(async (error: unknown) => {
      await this.requests.releaseClaim(requestId);
      throw error;
    });

    if (outcome.mode === 'created') {
      await this.requests.finishApproval(requestId, {
        userId: outcome.account.user.id,
        organizationId: outcome.account.organizationId,
      });
    }

    await this.auditLog.record({
      actorUserId: adminUserId,
      action: 'registration_request.approved',
      entityType: 'registration_request',
      entityId: requestId,
      metadata:
        outcome.mode === 'created'
          ? { createdUserId: outcome.account.user.id, slug: outcome.account.organizationSlug }
          : { upgradeOfUserId: outcome.userId, awaitingConfirmation: true },
    });

    if (outcome.mode === 'created') {
      void this.sendLetter(request.email, () =>
        registrationApprovedLetter(
          resolveNotificationLocale(request.locale),
          request.fullName,
          `${this.appUrl}/login`,
        ),
      );
    }

    return outcome;
  }

  /**
   * Что именно делает одобрение — завести аккаунт или пригласить повысить
   * существующий. Письмо о повышении отправляет `invite`: оно часть его пути,
   * а не следствие решения администратора.
   */
  private async attempt(
    request: RegistrationRequestRow & { passwordHash: string },
    occupant: UserRow | null,
  ): Promise<ApprovalOutcome> {
    if (occupant) {
      await this.upgrades.invite(request, occupant);
      return { mode: 'confirmation-sent', email: request.email, userId: occupant.id };
    }

    const account = await this.accounts.create({
      fullName: request.fullName,
      email: request.email,
      phone: request.phone,
      locale: request.locale,
      passwordHash: request.passwordHash,
      /* Согласие дано при подаче, а не сейчас: одобрение — наше действие,
         а не его. */
      consentAt: request.createdAt,
    });

    return { mode: 'created', account };
  }

  /** Отказ с причиной. Причина уходит человеку письмом — молчание он читает как «меня проигнорировали». */
  async reject(requestId: string, adminUserId: string, reason: string): Promise<void> {
    const request = await this.requests.reject(requestId, adminUserId, reason);
    if (!request) {
      throw new NotFoundException({
        message: 'Заявка не найдена или решение по ней уже принято',
        code: DASHBOARD_ERROR_CODES.registrationRequestDecided,
      });
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
