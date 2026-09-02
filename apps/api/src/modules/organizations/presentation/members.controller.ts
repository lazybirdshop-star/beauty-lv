import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { sanitizeMedia } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { MediaUploadsService } from '../../media/application/media-uploads.service';
import { CreateImageUploadDto } from '../../media/presentation/dto/create-image-upload.dto';
import { MembersRepository } from '../infrastructure/members.repository';

import { UpdateMemberAvatarDto } from './dto/member-avatar.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Собственная строка участника. Сейчас — только портрет.
 *
 * Разрешения на маршруте нет намеренно, и это не упущение. `OrgMembershipGuard`
 * уже доказал, что зовущий — живой участник именно этой организации
 * (`invited` и `disabled` он не пропускает), а адрес заканчивается на `me`:
 * человек правит своё лицо. Требовать сверх этого `org:profile-page:manage`
 * значило бы запретить мастеру салона поставить себе фотографию — право на
 * оформление витрины по карте SALON.md §3.3 есть только у владельца и
 * администратора.
 *
 * Правка чужого портрета сюда не поместится по устройству маршрута — она
 * приедет с управлением участниками (SL-4) и своим правом `org:team:manage`.
 */
@Controller('organizations/:slug/members/me')
@UseGuards(JwtAuthGuard, OrgMembershipGuard)
export class MembersController {
  constructor(
    private readonly members: MembersRepository,
    private readonly mediaUploads: MediaUploadsService,
  ) {}

  /**
   * Право положить в хранилище один снимок — своё лицо.
   *
   * Отдельный вход, а не общий `media/image-uploads`: тот охраняется правом на
   * оформление страницы, и мастер салона до него не допущена. Объект при этом
   * ложится в тот же префикс организации — путь называет сервер, и назвать
   * чужой каталог зовущий не может.
   */
  @Post('avatar-uploads')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  createAvatarUpload(@Req() request: RequestWithOrgMembership, @Body() dto: CreateImageUploadDto) {
    return this.mediaUploads.createImageUpload(
      request.orgMembership!.organizationId,
      dto.contentType,
    );
  }

  /**
   * Собственный портрет — то, что Студия рисует на холсте.
   *
   * Своим запросом, а не полем в состоянии дизайна: состояние Студии описывает
   * черновик, публикацию и историю, а снимок не участвует ни в одном из трёх.
   * Положить его туда значило бы снова смешать оформление с человеком — ровно
   * то разделение, ради которого фото и уехало из `page_design`.
   */
  @Get()
  async getMe(@Req() request: RequestWithOrgMembership) {
    return { avatar: await this.members.findAvatar(request.orgMembership!.organizationMemberId) };
  }

  @Put('avatar')
  async setAvatar(@Req() request: RequestWithOrgMembership, @Body() dto: UpdateMemberAvatarDto) {
    /* Ссылка проходит того же судью, что и медиа страницы. Молча обнулить её
       нельзя: сохранение, после которого фотографии нет и никто не сказал
       почему, читается как поломка. */
    const avatar = sanitizeMedia(dto);
    if (!avatar) throw new BadRequestException('Ссылка на изображение недопустима');

    return this.members.setAvatar(request.orgMembership!.organizationMemberId, avatar);
  }

  @Delete('avatar')
  clearAvatar(@Req() request: RequestWithOrgMembership) {
    return this.members.setAvatar(request.orgMembership!.organizationMemberId, null);
  }
}
