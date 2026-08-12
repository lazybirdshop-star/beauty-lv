import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Applies pending migrations from `./drizzle` and exits.
 *
 * Deployment runs this before the new code starts (DEPLOYMENT.md §3.3), so it
 * is a standalone process rather than something the application does at boot:
 * a migration that runs on boot would fire once per instance, and two
 * instances starting together would race on the same DDL.
 *
 * Drizzle records what it applied in `drizzle.__drizzle_migrations` and skips
 * anything already there, so re-running is a no-op rather than an error.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const pool = new Pool({ connectionString });

  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
