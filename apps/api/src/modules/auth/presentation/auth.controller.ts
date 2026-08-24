import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { AUTH_ERROR_CODES } from '@amolie/shared-kernel';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { AccountMailService } from '../application/account-mail.service';
import { AuthService, type LoginResult } from '../application/auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  VerifyEmailDto,
} from './dto/password-reset.dto';
import { UpdateMeDto } from './dto/update-me.dto';

/**
 * Every route here is reachable without a token, or changes the credential
 * itself, so each carries a limit far below the global baseline (see
 * app.module.ts). The numbers are set against what an attacker needs, not what
 * a person does: nobody signs in ten times a minute, and a password-guessing
 * script needs thousands of attempts to be worth running.
 */
const SIGN_IN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
/** Guards the current-password check from being used as an oracle. */
const PASSWORD_CHANGE_THROTTLE = { default: { limit: 5, ttl: 300_000 } };
/**
 * Запрос восстановления шлёт письмо на чужой адрес, поэтому лимит защищает не
 * нас, а человека: без него форму превращают в рассылку по чужому ящику.
 */
const RESET_REQUEST_THROTTLE = { default: { limit: 5, ttl: 3_600_000 } };
/** Токен — 256 бит, но угадывать его никто не должен даже пытаться дёшево. */
const TOKEN_THROTTLE = { default: { limit: 10, ttl: 600_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountMail: AccountMailService,
  ) {}

  @Post('login')
  @Throttle(SIGN_IN_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    return this.authService.login(user);
  }

  /**
   * Ответ одинаков и для известного адреса, и для неизвестного: иначе форма
   * становится проверялкой «зарегистрирован ли этот человек», а отвечать на
   * такой вопрос продукт не обязан никому.
   */
  @Post('password-reset/request')
  @Throttle(RESET_REQUEST_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<void> {
    await this.accountMail.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Throttle(TOKEN_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    const done = await this.accountMail.resetPassword(dto.token, dto.password);
    if (!done) {
      throw new BadRequestException({
        message: 'Ссылка недействительна или уже использована',
        code: AUTH_ERROR_CODES.resetTokenInvalid,
      });
    }
  }

  @Post('email/verify')
  @Throttle(TOKEN_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    const done = await this.accountMail.verifyEmail(dto.token);
    if (!done) {
      throw new BadRequestException({
        message: 'Ссылка недействительна или уже использована',
        code: AUTH_ERROR_CODES.resetTokenInvalid,
      });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.me(currentUser.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.authService.updateProfile(currentUser.sub, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @Throttle(PASSWORD_CHANGE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(currentUser.sub, dto.currentPassword, dto.newPassword);
    return { success: true };
  }
}
