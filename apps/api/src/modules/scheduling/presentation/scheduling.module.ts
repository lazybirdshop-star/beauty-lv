import { Module } from '@nestjs/common';

import { PublishedSlotsRepository } from '../infrastructure/published-slots.repository';
import { TimeBlocksRepository } from '../infrastructure/time-blocks.repository';
import { SchedulingController } from './scheduling.controller';
import { TimeBlocksController } from './time-blocks.controller';

@Module({
  controllers: [SchedulingController, TimeBlocksController],
  providers: [PublishedSlotsRepository, TimeBlocksRepository],
  exports: [PublishedSlotsRepository],
})
export class SchedulingModule {}
