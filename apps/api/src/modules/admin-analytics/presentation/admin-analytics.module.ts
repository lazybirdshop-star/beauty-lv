import { Module } from '@nestjs/common';

import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { WebPushClient } from '../../notifications/infrastructure/web-push.client';
import { ImpersonationService } from '../application/impersonation.service';
import { PlatformHealthService } from '../application/platform-health.service';
import { PlatformHealthRepository } from '../infrastructure/platform-health.repository';
import { AccountDeletionRepository } from '../infrastructure/account-deletion.repository';
import { AdminRepository } from '../infrastructure/admin.repository';
import { BookingsAdminRepository } from '../infrastructure/bookings-admin.repository';
import { FunnelRepository } from '../infrastructure/funnel.repository';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { MasterDetailRepository } from '../infrastructure/master-detail.repository';
import { OrganizationsAdminRepository } from '../infrastructure/organizations-admin.repository';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [
    AdminRepository,
    MasterDetailRepository,
    OrganizationsAdminRepository,
    BookingsAdminRepository,
    FunnelRepository,
    AccountDeletionRepository,
    ImpersonationService,
    PlatformHealthService,
    PlatformHealthRepository,
    WebPushClient,
    ResendClient,
    AuditLogRepository,
  ],
  exports: [AuditLogRepository],
})
export class AdminAnalyticsModule {}
