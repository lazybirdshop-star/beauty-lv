import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ERROR_CODES } from '@amolie/shared-kernel';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { ClientAccountService, type ClientVisits } from '../application/client-account.service';
import type { LoginResult } from '../../auth/application/auth.service';
import { ConfirmClientSignInDto, RequestClientSignInDto } from './dto/client-sign-in.dto';

/**
 * Запрос шлёт письмо на чужой адрес, поэтому лимит защищает не нас, а
 * человека: без него кнопка «запомнить меня» превращается в рассылку по
 * чужому ящику.
 */
const SIGN_IN_REQUEST_THROTTLE = { default: { limit: 5, ttl: 3_600_000 } };
/** Токен — 256 бит, но угадывать его никто не должен даже пытаться дёшево. */
const TOKEN_THROTTLE = { default: { limit: 10, ttl: 600_000 } };

/**
 * Кабинет клиента (API.md §11).
 *
 * Живёт на корне, а не под `organizations/:slug`: у визитов к разным мастерам
 * нет общей организации, и адрес, принадлежащий одному из них, был бы враньём
 * о том, чей это список.
 */
@Controller('client')
export class ClientAccountController {
  constructor(private readonly clientAccount: ClientAccountService) {}

  @Post('sign-in/request')
  @Throttle(SIGN_IN_REQUEST_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestSignIn(@Body() dto: RequestClientSignInDto): Promise<void> {
    await this.clientAccount.requestSignIn(dto);
  }

  @Post('sign-in/confirm')
  @Throttle(TOKEN_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async confirmSignIn(@Body() dto: ConfirmClientSignInDto): Promise<LoginResult> {
    const result = await this.clientAccount.confirmSignIn(dto.token);
    if (!result) {
      /* Тот же контракт, что и у входа мастера: машиночитаемый `code`, потому
         что экран рисуется до того, как у человека появился язык. */
      throw new BadRequestException({
        message: 'Ссылка недействительна',
        code: AUTH_ERROR_CODES.signInTokenInvalid,
      });
    }
    return result;
  }

  @Get('visits')
  @UseGuards(JwtAuthGuard)
  async listVisits(@CurrentUser() user: AuthenticatedUser): Promise<ClientVisits> {
    return this.clientAccount.listVisits(user.sub);
  }
}
