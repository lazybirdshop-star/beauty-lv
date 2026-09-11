import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

const DEFAULT_LIMIT = 20;

/**
 * Журнал действий заведения — «кто это сделал» (спецификация дашборда §72).
 *
 * Та же таблица `audit_log`, что у журнала платформы, суженная до своей
 * организации. Только владелице: журнал называет, кто из команды отстранил
 * коллегу или удалил клиента, — это вопрос владения заведением, а не работы в
 * нём (`org:settings:manage`, SALON.md §3.3).
 *
 * Отдаётся проекция, а не строка журнала: `metadata` пишут четырнадцать мест
 * для разбора поддержкой, и выносить её в кабинет значит однажды показать
 * внутреннее поле. Имя поддержки тоже не отдаётся — владелице достаточно
 * знать, что действие сделано через поддержку, а не кем именно из неё.
 */
@Controller('organizations/:slug/activity-log')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class OrganizationActivityController {
  constructor(private readonly auditLog: AuditLogRepository) {}

  @Get()
  @RequirePermissions('org:settings:manage')
  async list(@Req() request: RequestWithOrgMembership, @Query() query: ActivityLogQueryDto) {
    const { organizationId } = request.orgMembership!;
    const page = await this.auditLog.listForOrganization(organizationId, {
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });

    return {
      total: page.total,
      items: page.items.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        createdAt: entry.createdAt,
        actorName: entry.actorName,
        viaSupport: entry.impersonatedByUserId !== null,
        severity: entry.severity,
      })),
    };
  }
}
