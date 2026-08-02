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

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { AuthService, type LoginResult } from '../application/auth.service';
import { EmailTakenError, InviteCodeInvalidError } from '../infrastructure/registration.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    return this.authService.login(user);
  }

  /**
   * Public by necessity — a new master has no token yet. The invite code is
   * the gate. NOTE: rate limiting (TASKS.md A-10) is still open and MUST be
   * in place before this is exposed to the open internet.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<LoginResult> {
    try {
      return await this.authService.register(dto);
    } catch (error) {
      if (error instanceof InviteCodeInvalidError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof EmailTakenError) {
        throw new ConflictException(error.message);
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
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(currentUser.sub, dto.currentPassword, dto.newPassword);
    return { success: true };
  }
}
