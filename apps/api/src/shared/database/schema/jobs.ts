import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const jobStatusEnum = pgEnum('job_status', ['pending', 'running', 'done', 'failed']);

/**
 * Очередь фоновых задач — в той же базе, что и всё остальное.
 *
 * Появилась ради писем о записях. Слать их прямо из обработчика запроса
 * нельзя: недоступный почтовый провайдер уронил бы саму запись, а запись —
 * событие, письмо — его следствие. Между ними нужен посредник, который
 * переживёт отказ провайдера и повторит попытку.
 *
 * Postgres, а не Redis с BullMQ: очередь на десяток писем в час не стоит
 * отдельного сервиса — новой инфраструктуры, новых денег и ещё одной точки
 * отказа. Выборка через `FOR UPDATE SKIP LOCKED` — обычный приём, который
 * работает и через пулер Supabase, в отличие от библиотек, которым нужны
 * сессионные соединения и `LISTEN/NOTIFY`.
 *
 * `run_at` в самой таблице — то, ради чего своя очередь оказалась даже
 * удобнее готовой: напоминание за N часов это просто задача с датой в
 * будущем, а не отдельный планировщик.
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Что делать: `booking.created`, `booking.reminder` и подобные. */
    kind: text('kind').notNull(),
    /** Всё, что нужно обработчику. Идентификаторы, а не снимки данных. */
    payload: jsonb('payload').notNull().default({}),
    status: jobStatusEnum('status').notNull().default('pending'),
    /** Не раньше этого момента. Для напоминаний — время визита минус N часов. */
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    /**
     * Ключ, по которому задача не задваивается.
     *
     * Напоминание о визите ровно одно: правка записи, повторное сохранение,
     * два одновременных запроса — всё это не должно порождать второе письмо
     * в тот же телефон. Уникальность частичная (только среди живых задач),
     * поэтому вчерашнее выполненное напоминание не мешает завести сегодняшнее.
     */
    dedupeKey: text('dedupe_key'),
    /** Последняя причина отказа — чтобы «упало» отличалось от «упало почему». */
    lastError: text('last_error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* Воркер спрашивает одно и то же каждые несколько секунд: «что уже пора».
       Частичный индекс держит в себе только ждущие задачи — выполненные
       копятся годами и в этот вопрос не входят. */
    index('jobs_pending_run_at_idx')
      .on(table.runAt)
      .where(sql`${table.status} = 'pending'`),
    /* Возврат брошенных задач спрашивает «кто выполняется дольше положенного»
       каждую минуту, и под индекс ждущих такой вопрос не подходит вовсе:
       колонка другая и статус другой. Без своего индекса это был полный
       проход по таблице, которая копится годами. */
    index('jobs_running_started_at_idx')
      .on(table.startedAt)
      .where(sql`${table.status} = 'running'`),
    uniqueIndex('jobs_dedupe_key_active_unique')
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null and ${table.status} in ('pending', 'running')`),
  ],
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
