import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { isStaffRole } from '@amolie/shared-kernel';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { AnnouncementsRepository } from '../infrastructure/announcements.repository';

/**
 * Объявления платформы — со стороны того, кто их читает.
 *
 * Без проверки прав кроме входа: объявление адресовано всем, кто работает в
 * продукте, и права здесь ничего не решают. Отметка «прочитано» принадлежит
 * человеку, а не организации, — мастер с двумя салонами закрывает объявление
 * один раз.
 *
 * «Кто работает в продукте» — это не всякий вошедший: у клиентки салона тоже
 * есть аккаунт и сессия. Аудитория «мастерам» считается в запросе как «не
 * состоит в салоне» (`announcements.repository.ts`), и под это условие клиент
 * попадает целиком, — то есть внутренние объявления площадки читались бы из
 * кабинета клиента. Поэтому граница проводится здесь, по системной роли.
 */
@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsRepository) {}

  @Get('active')
  active(@CurrentUser() user: AuthenticatedUser) {
    if (!isStaffRole(user.role)) return [];
    return this.announcements.activeFor(user.sub);
  }

  @Post(':announcementId/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismiss(
    @CurrentUser() user: AuthenticatedUser,
    @Param('announcementId', ParseUUIDPipe) announcementId: string,
  ): Promise<void> {
    await this.announcements.dismiss(announcementId, user.sub);
  }
}
