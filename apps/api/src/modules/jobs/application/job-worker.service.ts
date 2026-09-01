import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import type { JobRow } from '../../../shared/database/schema/jobs';
import { JobsRepository } from '../infrastructure/jobs.repository';
import { JobHandlersRegistry, type JobPayload } from './job-handlers.registry';

/**
 * Как часто заглядывать в очередь.
 *
 * Опрос, а не `LISTEN/NOTIFY`: через пулер Supabase подписка не переживает
 * смену соединения, и очередь, которая иногда просыпается, хуже очереди,
 * которая всегда просыпается через пять секунд. Цена опроса — один дешёвый
 * запрос по частичному индексу; на нашем объёме это ничто.
 */
const POLL_INTERVAL_MS = 5_000;

/** Сколько задач берётся за раз. Больше — только вместе со вторым процессом. */
const BATCH_SIZE = 5;

/** Как часто искать задачи, брошенные умершей машиной. */
const RECLAIM_EVERY_TICKS = 12;

/**
 * Сколько живёт выполненная задача.
 *
 * Три месяца — срок, за который ещё спрашивают «а дошло ли письмо». Дальше
 * строка отвечает на вопрос, которого никто не задаёт, но продолжает лежать в
 * бэкапах и на диске. Неудачные задачи этот срок не касается: они хранятся
 * бессрочно, потому что это работа, которая не сделана.
 */
const COMPLETED_RETENTION_DAYS = 90;

/**
 * Как часто убирать выполненное — раз в сутки.
 *
 * Уборка не срочная и не должна выполняться чаще, чем накапливается материал:
 * при нескольких машинах каждая пройдёт по разу, и лишний проход — это лишний
 * `DELETE` по той же самой пустоте.
 */
const CLEANUP_EVERY_TICKS = (24 * 60 * 60 * 1000) / POLL_INTERVAL_MS;

/**
 * Единственный, кто исполняет отложенную работу.
 *
 * Живёт внутри процесса API намеренно: отдельный воркер — это вторая машина,
 * второй деплой и второй счёт за то, что сегодня занимает секунды в час.
 * Когда объём этого потребует, отделение будет стоить смены одного флага —
 * очередь в базе, и кто её разбирает, ей безразлично.
 */
@Injectable()
export class JobWorkerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  /** Тик не должен наезжать на предыдущий: медленный провайдер иначе множит попытки. */
  private ticking = false;
  private ticks = 0;
  private readonly enabled: boolean;

  constructor(
    private readonly jobs: JobsRepository,
    private readonly handlers: JobHandlersRegistry,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('JOBS_WORKER_ENABLED', { infer: true });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Job worker is disabled (JOBS_WORKER_ENABLED=false)');
      return;
    }
    /* `unref`: таймер не должен сам по себе удерживать процесс живым — иначе
       контейнер, которому сказали остановиться, будет дотикивать. */
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Один заход: вернуть брошенное, взять пачку, выполнить по очереди.
   *
   * Последовательно, а не параллельно: обработчики упираются в один HTTP к
   * провайдеру, и пять одновременных писем не приедут заметно быстрее пяти
   * последовательных — зато параллельный отказ провайдера сжёг бы попытки у
   * всех пяти разом.
   *
   * Публичный, чтобы тест мог позвать один тик, не заводя таймер.
   */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;

    try {
      this.ticks += 1;
      if (this.ticks % RECLAIM_EVERY_TICKS === 0) {
        const reclaimed = await this.jobs.reclaimStuck();
        if (reclaimed > 0) this.logger.warn(`Reclaimed ${reclaimed} stuck job(s)`);
      }

      if (this.ticks % CLEANUP_EVERY_TICKS === 0) {
        const cutoff = new Date(Date.now() - COMPLETED_RETENTION_DAYS * 86_400_000);
        const removed = await this.jobs.deleteCompletedBefore(cutoff);
        if (removed > 0) this.logger.log(`Removed ${removed} completed job(s) past retention`);
      }

      const claimed = await this.jobs.claim(BATCH_SIZE);
      for (const job of claimed) {
        await this.run(job);
      }
    } catch (error) {
      /* Сорвался сам заход — чаще всего недоступна база. Задачи при этом
         остались в очереди, и следующий тик возьмёт их снова. */
      this.logger.error(`Job tick failed: ${String(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  private async run(job: JobRow): Promise<void> {
    const handler = this.handlers.find(job.kind);
    if (!handler) {
      await this.jobs.fail(job, `no handler for kind "${job.kind}"`);
      return;
    }

    try {
      await handler(job.payload as JobPayload);
      await this.jobs.complete(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      /* Идентификатор задачи, а не её содержимое: в `payload` лежат чужие
         адреса и имена, а лог видят люди, которым чужая почта недоступна. */
      this.logger.error(
        `Job ${job.id} (${job.kind}) failed on attempt ${job.attempts}: ${message}`,
      );
      await this.jobs.fail(job, message);
    }
  }
}
