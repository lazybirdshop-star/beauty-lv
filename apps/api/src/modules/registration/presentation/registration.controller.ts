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
import { RegistrationPendingError } from '../infrastructure/registration-requests.repository';
import { RegistrationService } from '../application/registration.service';
import { RegisterDto } from './dto/register.dto';

/**
 * Пятеро в час с одного адреса: живой человек регистрируется один раз, а
 * скрипт, оставленный без присмотра, забил бы очередь заявок за ночь.
 */
const REGISTER_THROTTLE = { default: { limit: 5, ttl: 3_600_000 } };

/**
 * Ответ на регистрацию: либо готовый кабинет, либо принятая заявка.
 *
 * Размечен полем `mode`, а не угадывается по наличию токена: экран показывает
 * в этих случаях совершенно разное, и различать их по совпадению полей —
 * способ однажды показать «заявка отправлена» тому, кто уже вошёл.
 */
export type RegisterResponse =
  ({ mode: 'open' } & LoginResult) | { mode: 'moderated'; requestId: string };

/**
 * Маршрут остался `/auth/register`: для мастера это по-прежнему регистрация.
 * Модуль другой, потому что решение «впускать ли» принадлежит регистрации, а
 * не входу — вход отвечает только за тех, кто уже впущен.
 */
@Controller('auth')
export class RegistrationController {
  constructor(
    private readonly registration: RegistrationService,
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
        return { mode: 'moderated', requestId: outcome.requestId };
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
      if (error instanceof RegistrationPendingError) {
        throw new ConflictException({
          message: error.message,
          code: AUTH_ERROR_CODES.registrationPending,
        });
      }
      if (error instanceof EmailTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.emailTaken });
      }
      if (error instanceof PhoneTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.phoneTaken });
      }
      throw error;
    }
  }
}
