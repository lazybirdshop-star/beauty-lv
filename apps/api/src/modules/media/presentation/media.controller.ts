import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { MediaUploadsService } from '../application/media-uploads.service';

import { CreateImageUploadDto } from './dto/create-image-upload.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Загрузка изображений страницы мастера (DESIGN_STUDIO.md §5.3).
 *
 * Сервер не принимает файл, а подписывает право положить один объект: тело
 * запроса шло бы через Next-BFF, у которого предел 4.5 МБ на serverless, и
 * оплачивалось бы трафиком приложения дважды. Браузер грузит файл прямо в
 * хранилище по ссылке, живущей два часа.
 *
 * Права те же, что у Студии (`org:profile-page:manage`): загрузка — часть
 * оформления страницы, а не отдельная зона.
 */
@Controller('organizations/:slug/media')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
@RequirePermissions('org:profile-page:manage')
export class MediaController {
  constructor(private readonly mediaUploads: MediaUploadsService) {}

  /**
   * Лимит отдельный от глобального: подпись дешёвая, но каждая выданная
   * ссылка — это два часа права записи в хранилище, и раздавать их пачками
   * не нужно даже своему мастеру.
   */
  @Post('image-uploads')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  createImageUpload(@Req() request: RequestWithOrgMembership, @Body() dto: CreateImageUploadDto) {
    return this.mediaUploads.createImageUpload(
      request.orgMembership!.organizationId,
      dto.contentType,
    );
  }

  /**
   * Фото услуги. Отдельный маршрут ради права, а не ради поведения: услугами
   * распоряжается `org:services:manage`, и один общий вход выдал бы правку
   * прайса тому, кому доверено только оформление. Право на обработчике
   * перекрывает классовое (`PermissionsGuard` читает handler первым).
   */
  @Post('service-image-uploads')
  @RequirePermissions('org:services:manage')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  createServiceImageUpload(
    @Req() request: RequestWithOrgMembership,
    @Body() dto: CreateImageUploadDto,
  ) {
    return this.mediaUploads.createImageUpload(
      request.orgMembership!.organizationId,
      dto.contentType,
    );
  }
}
