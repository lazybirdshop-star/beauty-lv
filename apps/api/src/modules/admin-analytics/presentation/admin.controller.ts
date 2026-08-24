import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AdminRepository } from '../infrastructure/admin.repository';
import { MasterDetailRepository } from '../infrastructure/master-detail.repository';
import { OrganizationsAdminRepository } from '../infrastructure/organizations-admin.repository';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import {
  AdminAccountsQueryDto,
  AdminOrganizationsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-list.query.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateSystemRoleDto } from './dto/update-system-role.dto';

/** See API.md §6.8. Permission-gated, not raw-role-gated — see shared/auth. */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly masterDetailRepository: MasterDetailRepository,
    private readonly organizationsRepository: OrganizationsAdminRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  @Get('organizations')
  @RequirePermissions('admin:masters:manage')
  organizations(@Query() query: AdminOrganizationsQueryDto) {
    return this.organizationsRepository.list(query);
  }

  /**
   * Приостановка и архив салона.
   *
   * Действие с последствиями для чужих клиентов: приостановленный салон
   * перестаёт показывать публичную страницу и принимать новые записи —
   * поэтому оно в журнале вместе с тем, куда именно состояние переведено.
   * Уже назначенные визиты остаются доступны гостям по их токенам.
   */
  @Patch('organizations/:organizationId/status')
  @RequirePermissions('admin:masters:manage')
  async setOrganizationStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    const updated = await this.organizationsRepository.setStatus(organizationId, dto.status);
    if (!updated) {
      throw new NotFoundException('Салон не найден');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: `organization.${dto.status}`,
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
    });

    return updated;
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
  masters(@Query() query: AdminAccountsQueryDto) {
    return this.adminRepository.listMasters(query);
  }

  /**
   * Карточка мастера — вместе с журналом действий по ней.
   *
   * Одним ответом, а не двумя запросами с экрана: журнал здесь не отдельный
   * раздел, а часть ответа на вопрос «что с этим аккаунтом происходило», и
   * экран без него неполон.
   */
  @Get('masters/:userId')
  @RequirePermissions('admin:masters:manage')
  async master(@Param('userId', ParseUUIDPipe) userId: string) {
    const master = await this.masterDetailRepository.find(userId);
    if (!master) {
      throw new NotFoundException('Мастер не найден');
    }

    return { ...master, activity: await this.auditLogRepository.listForEntity(userId) };
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
