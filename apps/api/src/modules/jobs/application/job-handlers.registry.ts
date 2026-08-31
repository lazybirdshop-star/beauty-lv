import { Injectable, Logger } from '@nestjs/common';

export type JobPayload = Record<string, unknown>;
export type JobHandler = (payload: JobPayload) => Promise<void>;

/**
 * Кто что умеет делать.
 *
 * Реестр, а не `switch` внутри воркера, ровно по одной причине: очередь —
 * общая инфраструктура, а письма о записях принадлежат уведомлениям.
 * Знай воркер про письма, модуль записей и модуль уведомлений оказались бы
 * связаны через него, и добавление второго вида задач требовало бы правки
 * третьего модуля.
 *
 * Обработчик обязан быть идемпотентным: задачу можно взять повторно после
 * упавшей машины, и повтор не должен превращаться во второе письмо, если
 * первое уже ушло.
 */
@Injectable()
export class JobHandlersRegistry {
  private readonly logger = new Logger(JobHandlersRegistry.name);
  private readonly handlers = new Map<string, JobHandler>();

  register(kind: string, handler: JobHandler): void {
    if (this.handlers.has(kind)) {
      /* Два обработчика на один вид — это молчаливое удвоение писем: второй
         вытеснил бы первого, и какой именно уцелел, зависело бы от порядка
         инициализации модулей. */
      throw new Error(`Job handler for "${kind}" is already registered`);
    }
    this.handlers.set(kind, handler);
  }

  /**
   * Задача есть, а обработчика нет — так бывает после выката, который убрал
   * вид задачи, оставив в очереди уже заведённые. Это не сбой, но и не
   * тишина: строка в логе, а сама задача уйдёт в `failed` по попыткам.
   */
  find(kind: string): JobHandler | null {
    const handler = this.handlers.get(kind);
    if (!handler) {
      this.logger.warn(`No handler registered for job kind "${kind}"`);
      return null;
    }
    return handler;
  }
}
