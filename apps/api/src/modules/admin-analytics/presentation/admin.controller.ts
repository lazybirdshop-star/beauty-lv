import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AdminRepository } from '../infrastructure/admin.repository';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { AdminListQueryDto, AdminUsersQueryDto } from './dto/admin-list.query.dto';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto';
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

  @Post('invite-codes')
  @RequirePermissions('admin:masters:manage')
  async createInviteCode(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateInviteCodeDto,
  ) {
    const created = await this.adminRepository.createInviteCode({
      issuedByUserId: currentUser.sub,
      intendedForName: dto.intendedForName,
      intendedForContact: dto.intendedForContact,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: 'invite_code.created',
      entityType: 'invite_code',
      entityId: created.id,
      metadata: { intendedForName: dto.intendedForName ?? null },
    });

    return created;
  }

  @Patch('invite-codes/:inviteCodeId/revoke')
  @RequirePermissions('admin:masters:manage')
  async revokeInviteCode(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('inviteCodeId') inviteCodeId: string,
  ) {
    const revoked = await this.adminRepository.revokeInviteCode(inviteCodeId);
    if (!revoked) {
      // Either it never existed or it is no longer `active` — a redeemed code
      // can't be taken back, the account it created already exists.
      throw new NotFoundException('Код не найден или уже использован');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: 'invite_code.revoked',
      entityType: 'invite_code',
      entityId: inviteCodeId,
    });

    return revoked;
  }

  @Get('summary')
  @RequirePermissions('admin:masters:manage')
  summary() {
    return this.adminRepository.getDashboardSummary();
  }

  @Get('trends')
  @RequirePermissions('admin:masters:manage')
  trends() {
    return this.adminRepository.getWeeklyTrends();
  }

  @Get('masters')
  @RequirePermissions('admin:masters:manage')
  masters(@Query() query: AdminListQueryDto) {
    return this.adminRepository.listMasters(query);
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
  users(@Query() query: AdminUsersQueryDto) {
    return this.adminRepository.listUsers(query);
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

  @Get('logs')
  @RequirePermissions('admin:logs:read')
  logs() {
    return this.auditLogRepository.list();
  }
}
