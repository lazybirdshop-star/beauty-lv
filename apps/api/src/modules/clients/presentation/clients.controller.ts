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
import type { Request } from 'express';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { ClientsRepository } from '../infrastructure/clients.repository';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientBlockDto } from './dto/update-client-block.dto';
import { UpsertClientDto } from './dto/upsert-client.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** A DB unique-violation error, from `pg`. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
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
    try {
      return await this.clientsRepository.create(this.organizationId(request), dto);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Клиент с таким телефоном уже есть в списке');
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
    try {
      const updated = await this.clientsRepository.update(
        this.organizationId(request),
        clientId,
        dto,
      );
      if (!updated) {
        throw new NotFoundException('Клиент не найден');
      }
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Клиент с таким телефоном уже есть в списке');
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
      throw new NotFoundException('Клиент не найден');
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

  @Delete(':clientId')
  @RequirePermissions('org:clients:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('clientId') clientId: string) {
    const deleted = await this.clientsRepository.softDelete(this.organizationId(request), clientId);
    if (!deleted) {
      throw new NotFoundException('Клиент не найден');
    }
    return { success: true };
  }
}
