import {
  BadRequestException,
  Body,
  ConflictException,
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
import { AuthService, type LoginResult } from '../application/auth.service';
import { EmailTakenError, InviteCodeInvalidError } from '../infrastructure/registration.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

/**
 * Every route here is reachable without a token, or changes the credential
 * itself, so each carries a limit far below the global baseline (see
 * app.module.ts). The numbers are set against what an attacker needs, not what
 * a person does: nobody signs in ten times a minute, and a password-guessing
 * script needs thousands of attempts to be worth running.
 */
const SIGN_IN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
/** An invite code is 31^8 combinations; five tries an hour keeps it that way. */
const REGISTER_THROTTLE = { default: { limit: 5, ttl: 3_600_000 } };
/** Guards the current-password check from being used as an oracle. */
const PASSWORD_CHANGE_THROTTLE = { default: { limit: 5, ttl: 300_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(SIGN_IN_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    return this.authService.login(user);
  }

  /**
   * Public by necessity — a new master has no token yet. The invite code is
   * the gate, and the throttle above is what keeps the gate from being
   * enumerated (TASKS.md A-10).
   */
  @Post('register')
  @Throttle(REGISTER_THROTTLE)
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<LoginResult> {
    try {
      return await this.authService.register(dto);
    } catch (error) {
      // Same contract as sign-in: a machine-readable `code` so the pre-login
      // screen can say this in the visitor's own language.
      if (error instanceof InviteCodeInvalidError) {
        throw new BadRequestException({
          message: error.message,
          code: AUTH_ERROR_CODES.inviteInvalid,
        });
      }
      if (error instanceof EmailTakenError) {
        throw new ConflictException({ message: error.message, code: AUTH_ERROR_CODES.emailTaken });
      }
      throw error;
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
