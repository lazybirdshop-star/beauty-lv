import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { SubscriptionsRepository } from '../infrastructure/subscriptions.repository';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { UpdateSubscriptionStatusDto } from './dto/update-subscription-status.dto';

/** Internal record-keeping only — no payment processor wired up (TASKS.md AP-4). */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  @Get('subscription-plans')
  @RequirePermissions('admin:subscriptions:manage')
  plans() {
    return this.subscriptionsRepository.listPlans();
  }

  @Get('subscriptions')
  @RequirePermissions('admin:subscriptions:manage')
  subscriptions() {
    return this.subscriptionsRepository.listWithOrganizations();
  }

  @Post('subscriptions')
  @RequirePermissions('admin:subscriptions:manage')
  async assignPlan(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: AssignPlanDto) {
    const subscription = await this.subscriptionsRepository.assignPlan(
      dto.organizationId,
      dto.planId,
    );

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: 'subscription.plan_assigned',
      entityType: 'organization',
      entityId: dto.organizationId,
      organizationId: dto.organizationId,
      metadata: { planId: dto.planId },
    });

    return subscription;
  }

  @Patch('subscriptions/:subscriptionId/status')
  @RequirePermissions('admin:subscriptions:manage')
  async setStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    const updated = await this.subscriptionsRepository.setStatus(subscriptionId, dto.status);
    if (!updated) {
      throw new NotFoundException('Подписка не найдена');
    }

    await this.auditLogRepository.record({
      actorUserId: currentUser.sub,
      action: `subscription.${dto.status}`,
      entityType: 'subscription',
      entityId: subscriptionId,
      organizationId: updated.organizationId,
    });

    return updated;
  }
}
