import { Module } from '@nestjs/common';

import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { BookingsRepository } from '../infrastructure/bookings.repository';
import { BookingController } from './booking.controller';

@Module({
  imports: [ServicesCatalogModule],
  controllers: [BookingController],
  providers: [BookingsRepository],
})
export class BookingModule {}
