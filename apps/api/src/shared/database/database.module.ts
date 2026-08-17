import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { Env } from '../../config/env.validation';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');
export const PG_POOL = Symbol('PG_POOL');

export type Database = NodePgDatabase<typeof schema>;

/**
 * Как долго ждать соединения, прежде чем признать, что его не будет.
 *
 * У `pg` по умолчанию здесь ноль — «ждать бесконечно», и это худший из
 * возможных ответов для этого API: `JwtAuthGuard` ходит в базу на **каждом**
 * авторизованном запросе, поэтому просевшая база не отдаёт ошибку, а
 * бесшумно копит висящие запросы, пока не кончатся сокеты. Пять секунд —
 * заметно больше нормального соединения внутри одного региона (база в том же
 * Стокгольме, см. fly.toml) и заметно меньше терпения человека.
 */
const CONNECTION_TIMEOUT_MS = 5_000;

/**
 * Потолок соединений на один экземпляр API.
 *
 * Считается против пулера Supabase, а не против нагрузки: лимит там общий на
 * проект, и несколько машин, каждая со своим щедрым пулом, выбирают его
 * втроём, оставляя миграции и psql без единого соединения.
 */
const MAX_POOL_CONNECTIONS = 10;

/**
 * Global database provider. `pg.Pool` connects lazily on first query, so
 * application boot never fails just because Postgres isn't reachable yet
 * (see ARCHITECTURE.md §7) — что база на самом деле отвечает, проверяет
 * `/health`, и выкатка идёт только через него.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Pool =>
        new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
          max: MAX_POOL_CONNECTIONS,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Отпустить соединения, когда машину останавливают.
   *
   * Выкатка на Fly катится `rolling` (fly.toml): старая машина получает
   * SIGTERM, и без этого её соединения остаются висеть на стороне Postgres до
   * собственного таймаута — а лимит пулера общий, так что во время выкатки
   * его занимают разом и уходящая версия, и пришедшая.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
