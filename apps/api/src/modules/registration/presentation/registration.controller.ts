import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ERROR_CODES, type RegistrationMode } from '@amolie/shared-kernel';

import { AccountMailService } from '../../auth/application/account-mail.service';
import { AuthService, type LoginResult } from '../../auth/application/auth.service';
import { EmailTakenError, PhoneTakenError } from '../infrastructure/master-account.repository';
import {
  AccountUpgradeService,
  UpgradeTokenInvalidError,
} from '../application/account-upgrade.service';
import { RegistrationService } from '../application/registration.service';
import { ConfirmUpgradeDto } from './dto/confirm-upgrade.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Пятеро в час с одного адреса: живой человек регистрируется один раз, а
 * скрипт, оставленный без присмотра, забил бы очередь заявок за ночь.
 */
const REGISTER_THROTTLE = { default: { limit: 5, ttl: 3_600_000 } };

/**
 * Подтверждение ссылки — двадцать попыток в час.
 *
 * Токен несёт 256 бит случайности, перебирать его бессмысленно, но ручка
 * заводит аккаунты и трогает базу; лимит здесь не столько про подбор, сколько
 * про то, чтобы одна открытая вкладка не стала генератором нагрузки.
 */
const CONFIRM_THROTTLE = { default: { limit: 20, ttl: 3_600_000 } };

/**
 * Ответ на регистрацию: либо готовый кабинет, либо принятая заявка.
 *
 * Размечен полем `mode`, а не угадывается по наличию токена: экран показывает
 * в этих случаях совершенно разное, и различать их по совпадению полей —
 * способ однажды показать «заявка отправлена» тому, кто уже вошёл.
 */
export type RegisterResponse =
  | ({ mode: 'open' } & LoginResult)
  /* `requestId` необязателен, потому что повторная заявка отвечает так же,
     как первая, но второй заявки не заводит (см. `RegistrationService`).
     Экран его и не читает — он смотрит только на `mode`. */
  | { mode: 'moderated'; requestId?: string };

/**
 * Маршрут остался `/auth/register`: для мастера это по-прежнему регистрация.
 * Модуль другой, потому что решение «впускать ли» принадлежит регистрации, а
 * не входу — вход отвечает только за тех, кто уже впущен.
 */
@Controller('auth')
export class RegistrationController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly upgrades: AccountUpgradeService,
    private readonly authService: AuthService,
    private readonly accountMail: AccountMailService,
  ) {}

  /**
   * Как платформа впускает сегодня — вопрос без авторизации.
   *
   * Экран регистрации спрашивает его до отрисовки: в модерации он называется
   * «Заявка на регистрацию» и просит рассказать о себе, в открытом режиме —
   * «Создать кабинет» и не просит ничего лишнего. Один и тот же экран с
   * подписью «заявка» там, где аккаунт заводится мгновенно, обманывает.
   */
  @Get('registration-mode')
  async mode(): Promise<{ mode: RegistrationMode }> {
    return { mode: await this.registration.mode() };
  }

  @Post('register')
  @Throttle(REGISTER_THROTTLE)
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    try {
      const outcome = await this.registration.register(dto);

      if (outcome.mode === 'moderated') {
        return {
          mode: 'moderated',
          ...(outcome.requestId ? { requestId: outcome.requestId } : {}),
        };
      }

      /* Письма — следствие регистрации, а не её условие: ответ не ждёт
         почтового провайдера, и его недоступность не отменяет заведённый
         кабинет. Ошибки сервис гасит сам и пишет в лог. */
      void this.accountMail.sendWelcome(outcome.account.user);
      return {
        mode: 'open',
        ...(await this.authService.login(outcome.account.user)),
        redirectUrl: `/${outcome.account.organizationSlug}/dashboard/start`,
      };
    } catch (error) {
      /* Тот же контракт, что у входа: машиночитаемый `code`, потому что экран
         до входа localizes причину сам — своего языка у него ещё нет. */
      /*
       * `RegistrationPendingError` сюда больше не доходит: повторная заявка
       * отвечает тем же, чем первая, а правду получает владелец адреса
       * письмом — см. `RegistrationService.register`. Форма регистрации не
       * должна отвечать на вопрос «есть ли этот человек на AMOLIE».
       *
       * Ниже — тот же вопрос, на который ответ пока остаётся, и это
       * осознанно, а не забыто. Обе ошибки возможны **только в открытом
       * режиме** (`registration_mode = open`; умолчание — модерация): там
       * удачная регистрация заканчивается немедленным входом, и симметричного
       * ответа для занятого адреса просто не существует — «вошли» и «не
       * вошли» различимы по любому ответу. Убрать различие можно лишь одним
       * способом: сделать открытую регистрацию тоже двухшаговой, через
       * подтверждение адреса письмом, и тогда обе ветки будут отвечать
       * «проверьте почту». Это решение о продукте, а не правка охраны.
       *
       * Пока оно не принято, ценой перебора служит лимит регистрации —
       * 5 в час, и с проверкой подписи в `ClientThrottlerGuard` он снова
       * действует по настоящему адресу, а не по строке, которую вызывающий
       * себе выбирает.
       */
      if (error instanceof EmailTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.emailTaken });
      }
      if (error instanceof PhoneTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.phoneTaken });
      }
      throw error;
    }
  }

  /**
   * «Стать мастером» по ссылке из письма об одобрении.
   *
   * Заканчивается сразу входом: человек только что доказал, что почта его, и
   * отправлять его после этого на форму входа — просить пароль у того, кто
   * пять секунд назад подтвердил личность. Ведёт в начало онбординга, как и
   * обычная регистрация: кабинет пуст одинаково в обоих случаях.
   */
  @Post('registration/confirm-upgrade')
  @Throttle(CONFIRM_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async confirmUpgrade(@Body() dto: ConfirmUpgradeDto): Promise<LoginResult> {
    try {
      const account = await this.upgrades.confirm(dto.token);

      return {
        ...(await this.authService.login(account.user)),
        redirectUrl: `/${account.organizationSlug}/dashboard/start`,
      };
    } catch (error) {
      if (error instanceof UpgradeTokenInvalidError) {
        throw new ConflictException({
          message: error.message,
          code: AUTH_ERROR_CODES.upgradeTokenInvalid,
        });
      }
      if (error instanceof PhoneTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.phoneTaken });
      }
      throw error;
    }
  }
}
