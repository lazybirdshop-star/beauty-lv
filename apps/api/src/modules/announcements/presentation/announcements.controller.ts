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
 */
@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsRepository) {}

  @Get('active')
  active(@CurrentUser() user: AuthenticatedUser) {
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
