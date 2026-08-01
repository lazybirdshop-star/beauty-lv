import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { SubscriptionsRepository } from '../infrastructure/subscriptions.repository';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [AdminAnalyticsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsRepository],
})
export class SubscriptionsModule {}
