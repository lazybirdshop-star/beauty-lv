import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { ClientsRepository } from '../infrastructure/clients.repository';
import { ClientsController } from './clients.controller';

@Module({
  imports: [AdminAnalyticsModule],
  controllers: [ClientsController],
  providers: [ClientsRepository],
  exports: [ClientsRepository],
})
export class ClientsModule {}
