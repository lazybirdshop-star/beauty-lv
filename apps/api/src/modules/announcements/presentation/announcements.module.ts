import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { AnnouncementsRepository } from '../infrastructure/announcements.repository';
import { AnnouncementsAdminController } from './announcements-admin.controller';
import { AnnouncementsController } from './announcements.controller';

/**
 * Единственный канал, которым платформа говорит со всеми мастерами сразу.
 * До него оставалось писать каждой в мессенджер.
 */
@Module({
  imports: [AdminAnalyticsModule],
  controllers: [AnnouncementsController, AnnouncementsAdminController],
  providers: [AnnouncementsRepository],
})
export class AnnouncementsModule {}
