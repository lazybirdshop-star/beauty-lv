import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { Env } from '../../config/env.validation';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

/**
 * Global database provider. `pg.Pool` connects lazily on first query, so
 * application boot never fails just because Postgres isn't reachable yet
 * (see ARCHITECTURE.md §7 and DEPLOYMENT.md health-check discussion).
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): NodePgDatabase => {
        const pool = new Pool({ connectionString: config.get('DATABASE_URL', { infer: true }) });
        return drizzle(pool);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
