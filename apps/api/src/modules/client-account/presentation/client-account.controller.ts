import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ERROR_CODES } from '@amolie/shared-kernel';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { CancelByClientService } from '../../booking/application/cancel-by-client.service';
import {
  ClientAccountService,
  type ClientProfile,
  type ClientVisits,
} from '../application/client-account.service';
import type { LoginResult } from '../../auth/application/auth.service';
import { ClaimVisitDto } from './dto/claim-visit.dto';
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
  constructor(
    private readonly clientAccount: ClientAccountService,
    private readonly cancelByClient: CancelByClientService,
  ) {}

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

  /**
   * «Сохранить эту запись за собой» для того, кто уже вошёл — сразу, без
   * письма. Лимит тот же, что у погашения ссылки: аргумент здесь — секретный
   * токен записи, и перебирать его дёшево не должно быть.
   */
  @Post('visits/claim')
  @UseGuards(JwtAuthGuard)
  @Throttle(TOKEN_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async claimVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClaimVisitDto,
  ): Promise<void> {
    const claimed = await this.clientAccount.claimVisit(user.sub, dto.publicToken);
    if (!claimed) {
      throw new NotFoundException('Запись не найдена');
    }
  }

  /**
   * Кто вошёл — глазами формы записи, и только для роли `client`.
   *
   * Мастеру здесь отказ, а не её собственные данные: её визит на чужой
   * публичной странице остаётся гостевым (см. `createPublicBooking`), и
   * подставленные поля обещали бы связь, которой не будет.
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@CurrentUser() user: AuthenticatedUser): Promise<ClientProfile> {
    if (user.role !== 'client') throw new ForbiddenException('Не кабинет клиента');

    const profile = await this.clientAccount.profile(user.sub);
    if (!profile) throw new NotFoundException('Аккаунт не найден');

    return profile;
  }

  @Get('visits')
  @UseGuards(JwtAuthGuard)
  async listVisits(@CurrentUser() user: AuthenticatedUser): Promise<ClientVisits> {
    return this.clientAccount.listVisits(user.sub);
  }

  /**
   * Отмена своего визита. Правило «за сколько часов ещё можно» принадлежит
   * мастеру и живёт в `CancelByClientService` — той же услуге, которой
   * отменяет гость со страницы записи.
   */
  @Post('visits/:bookingId/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ): Promise<void> {
    await this.cancelByClient.cancelForClient(user.sub, bookingId);
  }
}
