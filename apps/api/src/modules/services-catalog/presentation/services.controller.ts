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
import { ServicesRepository } from '../infrastructure/services.repository';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertServiceDto } from './dto/upsert-service.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** Org-scoped CRUD for the master's service catalog (TASKS.md MD-4). */
@Controller('organizations/:slug/services')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class ServicesController {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  private organizationId(request: RequestWithOrgMembership): string {
    return request.orgMembership!.organizationId;
  }

  @Get()
  @RequirePermissions('org:services:manage')
  list(@Req() request: RequestWithOrgMembership) {
    return this.servicesRepository.listForOrganization(this.organizationId(request));
  }

  @Post()
  @RequirePermissions('org:services:manage')
  create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertServiceDto) {
    return this.servicesRepository.create(this.organizationId(request), dto);
  }

  @Patch(':serviceId')
  @RequirePermissions('org:services:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const updated = await this.servicesRepository.update(
      this.organizationId(request),
      serviceId,
      dto,
    );
    if (!updated) {
      throw new NotFoundException('Услуга не найдена');
    }
    return updated;
  }

  @Delete(':serviceId')
  @RequirePermissions('org:services:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('serviceId') serviceId: string) {
    const deleted = await this.servicesRepository.softDelete(
      this.organizationId(request),
      serviceId,
    );
    if (!deleted) {
      throw new NotFoundException('Услуга не найдена');
    }
    return { success: true };
  }
}
