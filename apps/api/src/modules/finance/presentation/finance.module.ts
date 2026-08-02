import { Module } from '@nestjs/common';

import { FinanceRepository } from '../infrastructure/finance.repository';
import { FinanceController } from './finance.controller';

@Module({
  controllers: [FinanceController],
  providers: [FinanceRepository],
})
export class FinanceModule {}
