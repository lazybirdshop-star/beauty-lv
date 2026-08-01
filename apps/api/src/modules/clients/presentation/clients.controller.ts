import {
  Body,
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

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { ClientsRepository } from '../infrastructure/clients.repository';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpsertClientDto } from './dto/upsert-client.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** Master's own address book (TASKS.md MD-5). */
@Controller('organizations/:slug/clients')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsRepository: ClientsRepository) {}

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
  create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertClientDto) {
    return this.clientsRepository.create(this.organizationId(request), dto);
  }

  @Patch(':clientId')
  @RequirePermissions('org:clients:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientDto,
  ) {
    const updated = await this.clientsRepository.update(
      this.organizationId(request),
      clientId,
      dto,
    );
    if (!updated) {
      throw new NotFoundException('Клиент не найден');
    }
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
