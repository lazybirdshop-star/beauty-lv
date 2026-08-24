import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { isUniqueViolation } from '../../../shared/database/unique-violation';
import { ClientsRepository } from '../infrastructure/clients.repository';
import { MergeClientDto } from './dto/merge-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientBlockDto } from './dto/update-client-block.dto';
import { UpsertClientDto } from './dto/upsert-client.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** Master's own address book (TASKS.md MD-5). */
@Controller('organizations/:slug/clients')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  private organizationId(request: RequestWithOrgMembership): string {
    return request.orgMembership!.organizationId;
  }

  @Get()
  @RequirePermissions('org:clients:manage')
  list(@Req() request: RequestWithOrgMembership) {
    return this.clientsRepository.listForOrganization(this.organizationId(request));
  }

  @Post()
  @RequirePermissions('org:clients:manage')
  async create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertClientDto) {
    const organizationId = this.organizationId(request);

    /*
     * Дубль ловится по правилу сравнения, а не уникальным индексом.
     *
     * Индекс `(organization_id, phone)` сравнивает строки, и «20000114» с
     * «+37120000114» проходили обе: в адресной книге появлялся второй человек
     * с тем же именем и той же историей визитов. Через запись это давно
     * закрыто (`upsertClientFromBooking` ищет по хвосту номера), а через форму
     * «добавить клиента» — нет.
     *
     * Ответ тот же `409`, что и у индекса: экран уже умеет его показывать
     * («клиент с таким телефоном уже есть»), и мастеру безразлично, каким из
     * двух способов её остановили.
     */
    if (dto.phone) {
      const existing = await this.clientsRepository.findByPhoneMatch(organizationId, dto.phone);
      if (existing) {
        throw new ConflictException({
          message: 'Клиент с таким телефоном уже есть в списке',
          code: DASHBOARD_ERROR_CODES.clientPhoneTaken,
        });
      }
    }

    try {
      return await this.clientsRepository.create(organizationId, dto);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: 'Клиент с таким телефоном уже есть в списке',
          code: DASHBOARD_ERROR_CODES.clientPhoneTaken,
        });
      }
      throw error;
    }
  }

  @Patch(':clientId')
  @RequirePermissions('org:clients:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientDto,
  ) {
    const organizationId = this.organizationId(request);

    /* То же правило при правке: сменив номер на чужой, карточка стала бы
       вторым экземпляром существующего человека. Своя карточка дублем себя
       не считается. */
    if (dto.phone) {
      const existing = await this.clientsRepository.findByPhoneMatch(
        organizationId,
        dto.phone,
        clientId,
      );
      if (existing) {
        throw new ConflictException({
          message: 'Клиент с таким телефоном уже есть в списке',
          code: DASHBOARD_ERROR_CODES.clientPhoneTaken,
        });
      }
    }

    try {
      const updated = await this.clientsRepository.update(organizationId, clientId, dto);
      if (!updated) {
        throw new NotFoundException({
          message: 'Клиент не найден',
          code: DASHBOARD_ERROR_CODES.clientNotFound,
        });
      }
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: 'Клиент с таким телефоном уже есть в списке',
          code: DASHBOARD_ERROR_CODES.clientPhoneTaken,
        });
      }
      throw error;
    }
  }

  @Patch(':clientId/block')
  @RequirePermissions('org:clients:manage')
  async setBlocked(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientBlockDto,
  ) {
    const organizationId = this.organizationId(request);
    const updated = await this.clientsRepository.setBlocked(
      organizationId,
      clientId,
      dto.isBlocked,
    );
    if (!updated) {
      throw new NotFoundException({
        message: 'Клиент не найден',
        code: DASHBOARD_ERROR_CODES.clientNotFound,
      });
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: dto.isBlocked ? 'client.blocked' : 'client.unblocked',
      entityType: 'client',
      entityId: clientId,
      organizationId,
    });

    return updated;
  }

  /**
   * Склеить две карточки одного человека.
   *
   * Дубли завелись до того, как форма научилась их ловить: тот же человек,
   * записанный один раз с кодом страны, другой — без. Историю визитов сливать
   * не нужно — записи связаны с адресной книгой номером, а не ключом, и по
   * правилу сравнения обе карточки давно указывают на одни и те же визиты.
   * Переносится то, что мастер писала руками; ничего не теряется (см.
   * репозиторий).
   *
   * Записывается в журнал: слияние необратимо в интерфейсе, и «кто и когда
   * склеил этих двоих» — вопрос, который однажды зададут.
   */
  @Post(':clientId/merge')
  @RequirePermissions('org:clients:manage')
  async merge(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Param('clientId') clientId: string,
    @Body() dto: MergeClientDto,
  ) {
    const organizationId = this.organizationId(request);
    const merged = await this.clientsRepository.merge(organizationId, clientId, dto.mergeId);

    /* `null` покрывает три случая разом: одной из карточек нет, она чужая, или
       мастер просит слить карточку с самой собой. Все три для неё выглядят
       одинаково — «этих клиентов больше нет в списке», — и разными ответами
       мы бы только рассказали постороннему, что существует, а что нет. */
    if (!merged) {
      throw new NotFoundException({
        message: 'Клиент не найден',
        code: DASHBOARD_ERROR_CODES.clientNotFound,
      });
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: 'client.merged',
      entityType: 'client',
      entityId: clientId,
      organizationId,
    });

    return merged;
  }

  @Delete(':clientId')
  @RequirePermissions('org:clients:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('clientId') clientId: string) {
    const deleted = await this.clientsRepository.softDelete(this.organizationId(request), clientId);
    if (!deleted) {
      throw new NotFoundException({
        message: 'Клиент не найден',
        code: DASHBOARD_ERROR_CODES.clientNotFound,
      });
    }
    return { success: true };
  }
}
