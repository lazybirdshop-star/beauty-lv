import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { PayrollService } from '../application/payroll.service';
import { PayrollRepository } from '../infrastructure/payroll.repository';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [AdminAnalyticsModule],
  controllers: [PayrollController],
  providers: [PayrollRepository, PayrollService],
})
export class PayrollModule {}
