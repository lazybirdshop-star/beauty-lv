import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import { BookingsRepository } from '../infrastructure/bookings.repository';

/**
 * Как часто искать записи, которым больше нечего ждать.
 *
 * Час — не срок, а точность: сама граница это время визита, и запись,
 * погашенная на пятьдесят минут позже него, ничем не отличается от
 * погашенной ровно в срок. Более частый проход стоил бы запросов каждые
 * несколько минут ради нуля строк.
 */
const SWEEP_INTERVAL_MS = 60 * 60_000;

/**
 * Запись, которой мастер так и не коснулась, перестаёт ждать.
 *
 * Пока этого не было, `pending` жил вечно: у мастера в списке висела заявка,
 * на которую она однажды не ответила, а у клиента страница статуса до
 * скончания века обещала, что решение будет.
 *
 * Периодическим проходом, а не задачей в очереди, и это осознанно: очередь
 * существует ради доставки — «сделать один раз, повторить при отказе», — а
 * здесь работа идемпотентная и не адресованная никому конкретно. Задача,
 * которая переставляет саму себя, к тому же спорила бы с собственным ключом
 * уникальности: её новая копия ставится, пока прежняя ещё числится
 * исполняемой.
 *
 * Выключается тем же флагом, что и разбор очереди: это одно и то же решение
 * — «делает ли этот процесс фоновую работу».
 */
@Injectable()
export class BookingExpiryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BookingExpiryService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly enabled: boolean;

  constructor(
    private readonly bookings: BookingsRepository,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('JOBS_WORKER_ENABLED', { infer: true });
  }

  onModuleInit(): void {
    if (!this.enabled) return;
    /* Первый проход сразу: машина могла простоять сутки, и ждать ещё час,
       прежде чем убрать вчерашние заявки, незачем. */
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    // Таймер не удерживает процесс живым: остановленный контейнер не дотикивает.
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Публичный, чтобы проверять один проход, не заводя таймера. */
  async sweep(now: Date = new Date()): Promise<number> {
    try {
      const expired = await this.bookings.expirePendingBefore(now);
      if (expired > 0) this.logger.log(`Expired ${expired} unanswered booking(s)`);
      return expired;
    } catch (error) {
      /* Недоступная база — не повод ронять процесс: следующий проход через
         час возьмёт те же записи, работа идемпотентная. */
      this.logger.error(`Booking expiry sweep failed: ${String(error)}`);
      return 0;
    }
  }
}
