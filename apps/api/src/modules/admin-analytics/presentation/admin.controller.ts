import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { ImpersonationService } from '../application/impersonation.service';
import { PlatformHealthService } from '../application/platform-health.service';
import { AccountDeletionRepository } from '../infrastructure/account-deletion.repository';
import { AdminRepository } from '../infrastructure/admin.repository';
import { BookingsAdminRepository } from '../infrastructure/bookings-admin.repository';
import { FunnelRepository } from '../infrastructure/funnel.repository';
import { MasterDetailRepository } from '../infrastructure/master-detail.repository';
import { OrganizationsAdminRepository } from '../infrastructure/organizations-admin.repository';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { AdminBookingsQueryDto } from './dto/admin-bookings.query.dto';
import { AdminLogsQueryDto } from './dto/admin-logs.query.dto';
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
    private readonly bookingsRepository: BookingsAdminRepository,
    private readonly impersonation: ImpersonationService,
    private readonly platformHealth: PlatformHealthService,
    private readonly funnelRepository: FunnelRepository,
    private readonly accountDeletion: AccountDeletionRepository,
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
      actor: currentUser,
      action: `organization.${dto.status}`,
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
    });

    return updated;
  }

  /**
   * Записи всей платформы.
   *
   * До сих пор записи существовали в панели единственным числом на главной, и
   * жалобу «клиент записался, а мастер записи не видит» разбирать было нечем:
   * список записей есть только внутри кабинета, куда у платформы входа нет.
   */
  @Get('bookings')
  @RequirePermissions('admin:masters:manage')
  bookings(@Query() query: AdminBookingsQueryDto) {
    return this.bookingsRepository.list({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  /**
   * Состояние подсистем — то, о чём иначе узнают по жалобе.
   *
   * Право то же, что у настроек платформы: и там, и здесь речь о том, как
   * настроена сама установка, а не о чьих-то данных.
   */
  @Get('health')
  @RequirePermissions('admin:platform-settings:manage')
  health() {
    return this.platformHealth.collect();
  }

  @Get('summary')
  @RequirePermissions('admin:masters:manage')
  summary() {
    return this.adminRepository.getDashboardSummary();
  }

  /**
   * Воронка: сколько мастеров дошло от регистрации до первого клиента.
   *
   * Объёмы («мастеров 42») говорят, сколько людей пришло, и молчат о том,
   * сколько из них дошло до работы — а это и есть вопрос, ради которого
   * платформу открывают по одной мастерской.
   */
  @Get('funnel')
  @RequirePermissions('admin:masters:manage')
  funnel() {
    return this.funnelRepository.collect();
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

  /**
   * Войти в кабинет мастера от её имени — для разбора обращения в поддержку.
   *
   * `POST`, а не `GET`: это не чтение, а выпуск ключа от чужого кабинета, и
   * такой запрос не должен уходить по нажатию ссылки, предзагрузке или
   * повтору из истории браузера.
   */
  @Post('masters/:userId/impersonate')
  @RequirePermissions('admin:masters:manage')
  impersonate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.impersonation.impersonate(userId, currentUser.sub);
  }

  /**
   * Что платформа хранит об этом человеке — ответ на «покажите мои данные».
   *
   * Клиентская книга и записи сюда не входят: это данные салона, и выгружает
   * их сама мастер из кабинета.
   */
  @Get('masters/:userId/export')
  @RequirePermissions('admin:users:manage')
  async exportMaster(@Param('userId', ParseUUIDPipe) userId: string) {
    const data = await this.accountDeletion.exportAccount(userId);
    if (!data) {
      throw new NotFoundException('Мастер не найден');
    }
    return data;
  }

  /**
   * Удаление аккаунта мастера.
   *
   * Право `admin:users:manage`, а не `masters:manage`: это тяжелее
   * блокировки — обратной кнопки у него нет.
   *
   * Предстоящие визиты запрещают удаление, и это не перестраховка: клиент,
   * пришедший в четверг к закрытой двери, — не цена за уборку данных.
   * Сначала визиты отменяются, и клиенты об этом узнают; потом удаляется
   * аккаунт.
   */
  @Delete('masters/:userId')
  @RequirePermissions('admin:users:manage')
  async deleteMaster(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ success: true }> {
    const result = await this.accountDeletion.deleteMaster(userId);

    if (!result.ok) {
      if (result.reason === 'not-found') {
        throw new NotFoundException('Мастер не найден');
      }
      if (result.reason === 'is-admin') {
        throw new BadRequestException('Удалить администратора платформы нельзя');
      }
      throw new ConflictException({
        message: `Сначала отмените предстоящие визиты: их ${result.blockers.upcomingBookings}`,
        upcomingBookings: result.blockers.upcomingBookings,
      });
    }

    await this.auditLogRepository.record({
      actor: currentUser,
      action: 'user.deleted',
      entityType: 'user',
      entityId: userId,
    });

    return { success: true };
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
      actor: currentUser,
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
      actor: currentUser,
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
      actor: currentUser,
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { newRole: dto.systemRole },
    });

    return updated;
  }

  @Get('logs')
  @RequirePermissions('admin:logs:read')
  logs(@Query() query: AdminLogsQueryDto) {
    return this.auditLogRepository.list({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  /** Сита журнала собираются из самих данных — см. `listActions`. */
  @Get('logs/actions')
  @RequirePermissions('admin:logs:read')
  async logActions(): Promise<{ actions: string[] }> {
    return { actions: await this.auditLogRepository.listActions() };
  }
}
