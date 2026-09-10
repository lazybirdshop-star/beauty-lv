import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DASHBOARD_ERROR_CODES, type UserLocale } from '@amolie/shared-kernel';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../../shared/auth/optional-jwt-auth.guard';
import { AuthService, type LoginResult } from '../../auth/application/auth.service';
import { UsersRepository } from '../../auth/infrastructure/users.repository';
import { TeamInvitesService } from '../application/team-invites.service';
import { TeamRuleError } from '../application/team.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Приглашение с той стороны — там, где по ссылке приходит человек.
 *
 * Маршрут вне организации и без права на команду: тот, кого зовут, ещё не
 * состоит в салоне, и требовать от него членства значило бы требовать того,
 * ради чего он и пришёл. Пропуском служит сама ссылка — тридцать два
 * случайных байта, хеш которых лежит в базе.
 *
 * `OptionalJwtAuthGuard`, а не `JwtAuthGuard`: в дверь стучат и с аккаунтом,
 * и без. Второе — обычный случай: салон зовёт человека, которого на платформе
 * ещё нет.
 */
@Controller('team-invites')
export class TeamInvitesController {
  constructor(
    private readonly invites: TeamInvitesService,
    private readonly authService: AuthService,
    private readonly users: UsersRepository,
  ) {}

  /**
   * Что показать до нажатия: куда зовут, кем и на какой адрес.
   *
   * Частота ограничена, потому что маршрут отвечает разное на существующую и
   * несуществующую ссылку — иначе он превращается в оракул для перебора.
   * Перебрать 256 бит нельзя, но дешёвая проверка догадок ни к чему.
   */
  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preview(@Param('token') token: string) {
    return this.run(() => this.invites.preview(token));
  }

  /**
   * Приём.
   *
   * Заканчивается сразу входом, если аккаунт только что заведён: человек
   * доказал, что почта его, самим переходом по ссылке, и просить у него
   * пароль через секунду после того, как он его придумал, незачем. Вошедший
   * получает свою сессию нетронутой — она уже есть.
   */
  @Post(':token/accept')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  async accept(
    @Req() request: RequestWithOptionalUser,
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ): Promise<Partial<LoginResult> & { redirectUrl: string }> {
    const result = await this.run(() =>
      this.invites.accept(
        token,
        request.user?.sub ?? null,
        dto.fullName && dto.phone && dto.password
          ? {
              fullName: dto.fullName,
              phone: dto.phone,
              password: dto.password,
              locale: (dto.locale as UserLocale) ?? 'ru',
            }
          : null,
      ),
    );

    const redirectUrl = `/${result.organizationSlug}/dashboard`;
    if (!result.signedUp) return { redirectUrl };

    const account = await this.users.findById(result.userId);
    /* Аккаунт заведён мгновение назад — его отсутствие означало бы, что база
       ответила не то, что записала, и молча отправить человека на форму входа
       было бы враньём. */
    if (!account) throw new NotFoundException('Аккаунт не найден');
    return { ...(await this.authService.login(account)), redirectUrl };
  }

  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof TeamRuleError)) throw error;
      const body = { message: error.message, code: error.code };
      if (error.code === DASHBOARD_ERROR_CODES.teamInviteInvalid) {
        throw new NotFoundException(body);
      }
      if (
        error.code === DASHBOARD_ERROR_CODES.teamAccountNotJoinable ||
        error.code === DASHBOARD_ERROR_CODES.teamInviteEmailMismatch
      ) {
        throw new ForbiddenException(body);
      }
      throw new ConflictException(body);
    }
  }
}
