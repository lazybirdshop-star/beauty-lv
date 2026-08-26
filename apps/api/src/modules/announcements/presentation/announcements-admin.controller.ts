import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { AdminListQueryDto } from '../../admin-analytics/presentation/dto/admin-list.query.dto';
import { AnnouncementsRepository } from '../infrastructure/announcements.repository';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

/**
 * Объявления со стороны того, кто их пишет.
 *
 * Право то же, что у настроек платформы: и там, и здесь речь о самой
 * установке, а не о чьих-то данных.
 */
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementsAdminController {
  constructor(
    private readonly announcements: AnnouncementsRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  @Get()
  @RequirePermissions('admin:platform-settings:manage')
  list(@Query() query: AdminListQueryDto) {
    return this.announcements.list(query);
  }

  @Post()
  @RequirePermissions('admin:platform-settings:manage')
  async create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateAnnouncementDto) {
    const created = await this.announcements.create({
      title: dto.title,
      body: dto.body,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      createdByUserId: currentUser.sub,
    });

    await this.auditLog.record({
      actor: currentUser,
      action: 'announcement.published',
      entityType: 'announcement',
      entityId: created.id,
      metadata: { title: created.title },
    });

    return created;
  }

  @Delete(':announcementId')
  @RequirePermissions('admin:platform-settings:manage')
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('announcementId', ParseUUIDPipe) announcementId: string,
  ): Promise<{ success: true }> {
    const removed = await this.announcements.remove(announcementId);
    if (!removed) {
      throw new NotFoundException('Объявление не найдено или уже снято');
    }

    await this.auditLog.record({
      actor: currentUser,
      action: 'announcement.removed',
      entityType: 'announcement',
      entityId: announcementId,
    });

    return { success: true };
  }
}
