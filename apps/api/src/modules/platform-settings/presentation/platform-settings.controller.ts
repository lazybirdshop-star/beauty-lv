import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

/**
 * No audit_log entry here (unlike Users/Subscriptions): `audit_log.entity_id`
 * is a required UUID and there's no real entity id for a singleton
 * key-value config — forcing one in (e.g. the actor's own id) would read as
 * "something happened to this user," which is misleading.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlatformSettingsController {
  constructor(private readonly platformSettingsRepository: PlatformSettingsRepository) {}

  @Get('platform-settings')
  @RequirePermissions('admin:platform-settings:manage')
  getAll() {
    return this.platformSettingsRepository.getAll();
  }

  @Patch('platform-settings')
  @RequirePermissions('admin:platform-settings:manage')
  async update(@Body() dto: UpdatePlatformSettingsDto) {
    await this.platformSettingsRepository.setMany(dto);
    return this.platformSettingsRepository.getAll();
  }
}
