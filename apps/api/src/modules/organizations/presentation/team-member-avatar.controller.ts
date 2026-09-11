import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DASHBOARD_ERROR_CODES, sanitizeMedia } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { MediaUploadsService } from '../../media/application/media-uploads.service';
import { CreateImageUploadDto } from '../../media/presentation/dto/create-image-upload.dto';
import { MembersRepository } from '../infrastructure/members.repository';
import { UpdateMemberAvatarDto } from './dto/member-avatar.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Фото участника команды — его ставит тот, кто ведёт команду.
 *
 * Пара к `MembersController` (`members/me`): там человек меняет своё лицо без
 * особых прав, здесь владелица или администратор ставят фото новому мастеру,
 * который сам до кабинета ещё не дошёл, — а клиентам на странице записи лицо
 * нужно с первого дня. Право — `org:team:manage`, то же, что у ролей и
 * отстранения.
 *
 * Снимок ложится в тот же префикс хранилища организации, подписывает ссылку
 * тот же сервис: второй выдаватель прав на запись в хранилище — вторая дыра.
 */
@Controller('organizations/:slug/team/:memberId')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
@RequirePermissions('org:team:manage')
export class TeamMemberAvatarController {
  constructor(
    private readonly members: MembersRepository,
    private readonly mediaUploads: MediaUploadsService,
  ) {}

  @Post('avatar-uploads')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async createAvatarUpload(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateImageUploadDto,
  ) {
    const { organizationId } = request.orgMembership!;
    if (!(await this.members.isMember(organizationId, memberId))) throw memberNotFound();
    return this.mediaUploads.createImageUpload(organizationId, dto.contentType);
  }

  @Put('avatar')
  async setAvatar(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberAvatarDto,
  ) {
    const avatar = sanitizeMedia(dto);
    if (!avatar) throw new BadRequestException('Ссылка на изображение недопустима');

    const result = await this.members.setAvatarInOrganization(
      request.orgMembership!.organizationId,
      memberId,
      avatar,
    );
    if (!result.found) throw memberNotFound();
    return result.avatar;
  }

  @Delete('avatar')
  async clearAvatar(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const result = await this.members.setAvatarInOrganization(
      request.orgMembership!.organizationId,
      memberId,
      null,
    );
    if (!result.found) throw memberNotFound();
    return null;
  }
}

function memberNotFound(): NotFoundException {
  return new NotFoundException({
    message: 'Участника с таким идентификатором в организации нет',
    code: DASHBOARD_ERROR_CODES.memberNotFound,
  });
}
