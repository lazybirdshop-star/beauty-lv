import { Module } from '@nestjs/common';

import { AdminRepository } from '../infrastructure/admin.repository';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [AdminRepository],
})
export class AdminAnalyticsModule {}
