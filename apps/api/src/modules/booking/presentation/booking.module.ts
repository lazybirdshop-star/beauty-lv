import { Module } from '@nestjs/common';

import { ClientsModule } from '../../clients/presentation/clients.module';
import { SchedulingModule } from '../../scheduling/presentation/scheduling.module';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { GuestBookingService } from '../application/guest-booking.service';
import { BookingsRepository } from '../infrastructure/bookings.repository';
import { BookingController } from './booking.controller';

@Module({
  imports: [ServicesCatalogModule, SchedulingModule, ClientsModule],
  controllers: [BookingController],
  providers: [BookingsRepository, GuestBookingService],
  exports: [BookingsRepository, GuestBookingService],
})
export class BookingModule {}
