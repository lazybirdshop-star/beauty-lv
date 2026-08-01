import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AdminRepository } from '../infrastructure/admin.repository';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateSystemRoleDto } from './dto/update-system-role.dto';

/** See API.md §6.8. Permission-gated, not raw-role-gated — see shared/auth. */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  @Get('organizations')
  @RequirePermissions('admin:masters:manage')
  organizations() {
    return this.adminRepository.listOrganizations();
  }

  @Get('invite-codes')
  @RequirePermissions('admin:masters:manage')
  inviteCodes() {
    return this.adminRepository.listInviteCodes();
  }

  @Get('summary')
  @RequirePermissions('admin:masters:manage')
  summary() {
    return this.adminRepository.getDashboardSummary();
  }

  @Get('masters')
  @RequirePermissions('admin:masters:manage')
  masters() {
    return this.adminRepository.listMasters();
  }

  @Patch('masters/:userId/status')
  @RequirePermissions('admin:masters:manage')
  async setMasterStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    const updated = await this.adminRepository.setAccountStatus(userId, dto.accountStatus);
    if (!updated) {
      throw new NotFoundException('Мастер не найден');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: dto.accountStatus === 'blocked' ? 'master.blocked' : 'master.unblocked',
      entityType: 'user',
      entityId: userId,
    });

    return updated;
  }

  @Get('users')
  @RequirePermissions('admin:users:manage')
  users() {
    return this.adminRepository.listUsers();
  }

  @Patch('users/:userId/status')
  @RequirePermissions('admin:users:manage')
  async setUserStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    const updated = await this.adminRepository.setAccountStatus(userId, dto.accountStatus);
    if (!updated) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: dto.accountStatus === 'blocked' ? 'user.blocked' : 'user.unblocked',
      entityType: 'user',
      entityId: userId,
    });

    return updated;
  }

  @Patch('users/:userId/role')
  @RequirePermissions('admin:users:manage')
  async setUserRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateSystemRoleDto,
  ) {
    const updated = await this.adminRepository.setSystemRole(userId, dto.systemRole);
    if (!updated) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { newRole: dto.systemRole },
    });

    return updated;
  }
}
