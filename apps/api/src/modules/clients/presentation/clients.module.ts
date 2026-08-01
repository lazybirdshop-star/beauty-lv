import { Module } from '@nestjs/common';

import { ClientsRepository } from '../infrastructure/clients.repository';
import { ClientsController } from './clients.controller';

@Module({
  controllers: [ClientsController],
  providers: [ClientsRepository],
})
export class ClientsModule {}
