import { Module } from '@nestjs/common';

import { PublishedSlotsRepository } from '../infrastructure/published-slots.repository';
import { SchedulingController } from './scheduling.controller';

@Module({
  controllers: [SchedulingController],
  providers: [PublishedSlotsRepository],
  exports: [PublishedSlotsRepository],
})
export class SchedulingModule {}
