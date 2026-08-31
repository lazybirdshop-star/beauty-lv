import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { jobs, type JobRow } from '../../../shared/database/schema/jobs';
import { retryDelayMs, STUCK_AFTER_MS } from '../domain/retry';

/**
 * То же, что `JobRow`, но как его отдаёт драйвер: даты — строки.
 *
 * Живёт здесь и нигде больше: наружу репозиторий отдаёт честный `JobRow`.
 */
type RawJobRow = Omit<JobRow, 'runAt' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'> & {
  runAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface EnqueueJob {
  kind: string;
  payload?: Record<string, unknown>;
  /** Не раньше этого момента. По умолчанию — сейчас. */
  runAt?: Date;
  /** Ключ, по которому та же задача не заводится дважды. */
  dedupeKey?: string;
  maxAttempts?: number;
}

@Injectable()
export class JobsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Поставить задачу в очередь.
   *
   * Повтор по `dedupe_key` не ошибка, а нормальный исход: правка записи и два
   * одновременных запроса вызывают это место столько раз, сколько случится, а
   * напоминание о визите должно остаться одно. Поэтому конфликт молча
   * пропускается, и вызывающему возвращается `null` — «уже стоит в очереди».
   */
  async enqueue(job: EnqueueJob, tx: Database = this.db): Promise<JobRow | null> {
    const [row] = await tx
      .insert(jobs)
      .values({
        kind: job.kind,
        payload: job.payload ?? {},
        runAt: job.runAt ?? new Date(),
        dedupeKey: job.dedupeKey,
        maxAttempts: job.maxAttempts,
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  /**
   * Взять пачку задач, до которых дошло время.
   *
   * `FOR UPDATE SKIP LOCKED` — то, ради чего очередь вообще может жить в
   * Postgres: две машины, спросившие одновременно, разбирают **разные**
   * строки, а не дерутся за одну и не ждут друг друга. Без `SKIP LOCKED`
   * вторая просто стояла бы на блокировке, и очередь работала бы в один
   * поток независимо от числа машин.
   *
   * Взятие и обновление статуса — один оператор: между «выбрали» и «пометили»
   * нельзя оставить промежуток, в котором соседняя машина возьмёт ту же
   * задачу и клиент получит два письма.
   *
   * Собрано шаблоном `sql`, а не построителем: `UPDATE ... FROM (SELECT ...
   * FOR UPDATE SKIP LOCKED)` drizzle не выражает. Поэтому этот метод обязан
   * быть проверен против живого Postgres (`*.int-spec.ts`) — мок здесь не
   * доказывает ничего.
   */
  async claim(limit: number, now: Date = new Date()): Promise<JobRow[]> {
    const { rows } = await this.db.execute<RawJobRow>(sql`
      update jobs
      set status = 'running',
          attempts = jobs.attempts + 1,
          started_at = ${now},
          updated_at = ${now}
      where id in (
        select id from jobs
        where status = 'pending' and run_at <= ${now}
        order by run_at
        limit ${limit}
        for update skip locked
      )
      returning
        id, kind, payload, status, run_at as "runAt", attempts, max_attempts as "maxAttempts",
        dedupe_key as "dedupeKey", last_error as "lastError", started_at as "startedAt",
        completed_at as "completedAt", created_at as "createdAt", updated_at as "updatedAt"
    `);
    /* Драйвер отдаёт временные колонки строками: drizzle снимает собственные
       разборщики типов у `pg`, чтобы разбирать их самому — но только в
       запросах, собранных построителем. Здесь запрос сырой, поэтому даты
       приводятся руками: `JobRow` обещает `Date`, и обещание должно быть
       правдой, иначе обработчик, сравнивший `runAt` с текущим временем,
       сравнит строку с числом. */
    /* Порядок восстанавливается здесь: `UPDATE ... RETURNING` отдаёт строки в
       порядке физического обновления, а не в порядке подзапроса. Выбраны
       по-прежнему самые давние, но выполнять их логично в том же порядке. */
    return rows
      .map((row) => ({
        ...row,
        runAt: new Date(row.runAt),
        startedAt: row.startedAt === null ? null : new Date(row.startedAt),
        completedAt: row.completedAt === null ? null : new Date(row.completedAt),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }))
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
  }

  /** Задача сделана. Строка остаётся: «письмо ушло» — тоже ответ на вопрос. */
  async complete(id: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(jobs)
      .set({ status: 'done', completedAt: now, updatedAt: now, lastError: null })
      .where(eq(jobs.id, id));
  }

  /**
   * Задача упала.
   *
   * Пока попытки не исчерпаны — обратно в очередь с отсрочкой; когда
   * исчерпаны — в `failed`, откуда её никто не возьмёт. Мёртвая задача не
   * удаляется намеренно: письмо, которое так и не ушло, должно оставить след,
   * иначе «клиент не получил подтверждение» превращается в слово против слова.
   */
  async fail(job: JobRow, error: string, now: Date = new Date()): Promise<void> {
    const exhausted = job.attempts >= job.maxAttempts;
    await this.db
      .update(jobs)
      .set({
        status: exhausted ? 'failed' : 'pending',
        /* Мёртвой задаче время запуска не меняется вовсе: её больше никто не
           возьмёт, а исходный `run_at` — след того, когда работа была нужна. */
        ...(exhausted ? {} : { runAt: new Date(now.getTime() + retryDelayMs(job.attempts)) }),
        lastError: error.slice(0, 1000),
        updatedAt: now,
      })
      .where(eq(jobs.id, job.id));
  }

  /**
   * Вернуть в очередь задачи, взятые и брошенные.
   *
   * Машина умирает между «взял» и «сделал» — строка остаётся `running`
   * навсегда, и письмо не уходит никогда. Счётчик попыток при этом уже
   * увеличен, поэтому вечного круга здесь нет: брошенная задача исчерпает
   * попытки так же, как падающая.
   */
  async reclaimStuck(now: Date = new Date()): Promise<number> {
    const rows = await this.db
      .update(jobs)
      .set({ status: 'pending', updatedAt: now })
      .where(
        and(
          eq(jobs.status, 'running'),
          lt(jobs.startedAt, new Date(now.getTime() - STUCK_AFTER_MS)),
        ),
      )
      .returning({ id: jobs.id });
    return rows.length;
  }

  /**
   * Отменить ещё не выполненную задачу по ключу.
   *
   * Визит отменили — напоминание о нём слать нельзя, и дешевле убрать задачу,
   * чем учить каждый обработчик заново проверять, жив ли ещё повод. Взятая в
   * работу задача не трогается: она уже исполняется, и её результат решает
   * сам обработчик.
   */
  async cancelByDedupeKey(dedupeKey: string): Promise<number> {
    const rows = await this.db
      .delete(jobs)
      .where(and(eq(jobs.dedupeKey, dedupeKey), eq(jobs.status, 'pending')))
      .returning({ id: jobs.id });
    return rows.length;
  }

  /** Для панели платформы и `/health`: сколько задач ждёт и сколько умерло. */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ status: jobs.status, count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(inArray(jobs.status, ['pending', 'running', 'failed']))
      .groupBy(jobs.status);
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
  }
}
