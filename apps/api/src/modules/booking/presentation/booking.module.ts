import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { ClientsModule } from '../../clients/presentation/clients.module';
import { NotificationsModule } from '../../notifications/presentation/notifications.module';
import { SchedulingModule } from '../../scheduling/presentation/scheduling.module';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { CancelByClientService } from '../application/cancel-by-client.service';
import { GuestBookingService } from '../application/guest-booking.service';
import { BookingsRepository } from '../infrastructure/bookings.repository';
import { BookingController } from './booking.controller';

@Module({
  imports: [
    ServicesCatalogModule,
    SchedulingModule,
    ClientsModule,
    NotificationsModule,
    AdminAnalyticsModule,
  ],
  controllers: [BookingController],
  providers: [BookingsRepository, GuestBookingService, CancelByClientService],
  exports: [BookingsRepository, GuestBookingService, CancelByClientService],
})
export class BookingModule {}
