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
import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
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
  constructor(
    private readonly servicesRepository: ServicesRepository,
    private readonly categoriesRepository: ServiceCategoriesRepository,
  ) {}

  /** `null` is a legitimate value — it detaches the service — and needs no check. */
  private async assertCategoryOwned(organizationId: string, categoryId?: string | null) {
    if (!categoryId) return;
    const owned = await this.categoriesRepository.belongsToOrganization(organizationId, categoryId);
    if (!owned) {
      throw new NotFoundException('Категория не найдена');
    }
  }

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
  async create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertServiceDto) {
    const organizationId = this.organizationId(request);
    await this.assertCategoryOwned(organizationId, dto.categoryId);
    return this.servicesRepository.create(organizationId, dto);
  }

  @Patch(':serviceId')
  @RequirePermissions('org:services:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const organizationId = this.organizationId(request);
    await this.assertCategoryOwned(organizationId, dto.categoryId);
    const updated = await this.servicesRepository.update(organizationId, serviceId, dto);
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
