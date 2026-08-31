import { Global, Module } from '@nestjs/common';

import { JobHandlersRegistry } from '../application/job-handlers.registry';
import { JobWorkerService } from '../application/job-worker.service';
import { JobsRepository } from '../infrastructure/jobs.repository';

/**
 * Очередь фоновых задач.
 *
 * `@Global`, как и база: задачу ставит тот, у кого случилось событие —
 * записи, регистрация, уведомления, — и тянуть импорт этого модуля в каждый
 * из них значило бы описывать очередь как зависимость предметной области, а
 * она инфраструктура, ровно как соединение с Postgres.
 */
@Global()
@Module({
  providers: [JobsRepository, JobHandlersRegistry, JobWorkerService],
  exports: [JobsRepository, JobHandlersRegistry],
})
export class JobsModule {}
