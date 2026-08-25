import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DASHBOARD_ERROR_CODES, type DashboardErrorCode } from '@amolie/shared-kernel';

import type { Env } from '../../../config/env.validation';
import type { RegistrationRequestRow } from '../../../shared/database/schema/registration-requests';
import type { UserRow } from '../../../shared/database/schema/users';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { UserTokensRepository } from '../../auth/infrastructure/user-tokens.repository';
import { registrationUpgradeLetter } from '../../notifications/application/letters';
import { resolveNotificationLocale } from '../../notifications/domain/notification-locale';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import {
  MasterAccountRepository,
  PhoneTakenError,
  type MasterAccountResult,
} from '../infrastructure/master-account.repository';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';

/**
 * Адрес заявки занят аккаунтом, который повысить нельзя.
 *
 * Не то же самое, что «email занят»: клиента мы повышаем, а мастера,
 * администратора или заблокированного — нет, и администратору нужно сказать
 * не «попробуйте ещё», а «здесь решение принимаете вы».
 */
export class AccountNotUpgradableError extends Error {
  constructor(
    readonly code: DashboardErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Ссылка из письма неизвестна, протухла или уже сработала. */
export class UpgradeTokenInvalidError extends Error {
  constructor() {
    super('Ссылка недействительна или уже использована');
  }
}

/**
 * Трое суток: письмо с решением по заявке человек читает не в ту же минуту —
 * он ждал ответа днями и мог уехать на выходные. Сутки, как у подтверждения
 * адреса, здесь означали бы «не открыл в пятницу — начинай заново».
 */
const UPGRADE_TTL_MINUTES = 3 * 24 * 60;

/**
 * Клиент становится мастером.
 *
 * Отдельный сервис, а не ветка в одобрении: у этого пути своя середина —
 * между решением администратора и появлением кабинета стоит человек, который
 * должен открыть письмо. Одобрение о ней знать не обязано: ему достаточно
 * «аккаунт появится не сейчас».
 *
 * **Почему через письмо, а не сразу.** Адрес при подаче заявки не
 * проверяется: заявку с чужим адресом отправляет кто угодно. Мгновенное
 * повышение отдало бы заявителю чужой аккаунт вместе с историей записей —
 * ссылка на сам адрес превращает это из «одобрил не глядя» в «прочитал свою
 * почту».
 */
@Injectable()
export class AccountUpgradeService {
  private readonly logger = new Logger(AccountUpgradeService.name);
  private readonly appUrl: string;

  constructor(
    private readonly requests: RegistrationRequestsRepository,
    private readonly accounts: MasterAccountRepository,
    private readonly tokens: UserTokensRepository,
    private readonly mail: ResendClient,
    private readonly auditLog: AuditLogRepository,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Можно ли повысить этот аккаунт — и если нет, то почему именно.
   *
   * Спрашивается до того, как одобрение что-то сделает: заявка, которую
   * нельзя исполнить, обязана остаться в очереди, а не стать «одобренной» без
   * последствий.
   */
  assertUpgradable(account: UserRow): void {
    if (account.systemRole !== 'client') {
      throw new AccountNotUpgradableError(
        DASHBOARD_ERROR_CODES.registrationEmailIsMaster,
        'Этот адрес принадлежит аккаунту мастера или администратора — заявку нужно отклонить',
      );
    }
    if (account.accountStatus === 'blocked') {
      throw new AccountNotUpgradableError(
        DASHBOARD_ERROR_CODES.registrationAccountBlocked,
        'Аккаунт с этим адресом заблокирован — сначала разблокируйте его',
      );
    }
  }

  /**
   * Приглашение подтвердить: ссылка уходит на сам адрес.
   *
   * Телефон проверяется здесь, а не при подтверждении: он уникален, и если он
   * уже за кем-то, узнать об этом должен администратор сейчас — а не человек
   * через три дня, когда откроет письмо и упрётся в отказ.
   */
  async invite(request: RegistrationRequestRow, account: UserRow): Promise<void> {
    this.assertUpgradable(account);

    const phoneOwner = await this.accounts.findLiveByPhone(request.phone);
    if (phoneOwner && phoneOwner.id !== account.id) {
      throw new PhoneTakenError();
    }

    const token = await this.tokens.issue(account.id, 'master_upgrade', UPGRADE_TTL_MINUTES, {
      registrationRequestId: request.id,
    });

    /* Письмо — следствие решения, а не его условие: недоступный провайдер не
       отменяет одобрения, а `send` наружу не бросает вовсе. */
    void this.mail.send({
      to: request.email,
      ...registrationUpgradeLetter(
        resolveNotificationLocale(request.locale),
        request.fullName,
        `${this.appUrl}/confirm-registration?token=${token}`,
      ),
    });
  }

  /**
   * Переход по ссылке: аккаунт становится мастерским, кабинет появляется.
   *
   * Токен гасится первым и в одном запросе — два одновременных перехода по
   * одной ссылке иначе завели бы два салона одному человеку.
   */
  async confirm(token: string): Promise<MasterAccountResult> {
    const issued = await this.tokens.consume(token, 'master_upgrade');
    if (!issued?.registrationRequestId) {
      throw new UpgradeTokenInvalidError();
    }

    const request = await this.requests.findById(issued.registrationRequestId);
    /* Заявка решена иначе, уже исполнена или лишилась пароля — во всех трёх
       случаях предъявленная ссылка больше ничего не значит. */
    if (
      !request ||
      request.status !== 'approved' ||
      request.createdUserId ||
      !request.passwordHash
    ) {
      throw new UpgradeTokenInvalidError();
    }

    const account = await this.accounts.findLiveById(issued.userId);
    if (!account) {
      throw new UpgradeTokenInvalidError();
    }
    this.assertUpgradable(account);

    const upgraded = await this.accounts.promoteToMaster(account.id, {
      fullName: request.fullName,
      phone: request.phone,
      locale: request.locale,
      passwordHash: request.passwordHash,
      consentAt: request.createdAt,
    });

    await this.requests.finishApproval(request.id, {
      userId: upgraded.user.id,
      organizationId: upgraded.organizationId,
    });

    await this.auditLog.record({
      /* Действующее лицо здесь — сам человек: администратор одобрил, но
         кабинет открыл переход по ссылке из его почты. */
      actorUserId: upgraded.user.id,
      action: 'registration_request.upgraded',
      entityType: 'registration_request',
      entityId: request.id,
      metadata: { userId: upgraded.user.id, slug: upgraded.organizationSlug },
    });

    this.logger.log(`Client ${upgraded.user.id} upgraded to master via request ${request.id}`);

    return upgraded;
  }
}
