import { Module } from '@nestjs/common';

import { AdminRepository } from '../infrastructure/admin.repository';
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
    AuditLogRepository,
  ],
  exports: [AuditLogRepository],
})
export class AdminAnalyticsModule {}
