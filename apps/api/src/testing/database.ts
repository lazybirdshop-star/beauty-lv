import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import * as schema from '../shared/database/schema';

/**
 * Живой Postgres для тестов репозиториев.
 *
 * Появился после дефекта, который прошёл мимо всех проверок и лёг в прод: свод
 * визитов клиента группировался по повтору выражения с параметром, и Postgres
 * отказывался считать `right(…, $1)` и `right(…, $3)` одним и тем же. Ни
 * компилятор, ни линтер, ни 263 теста API этого не видели — потому что все они
 * на моках, и ни один запрос не доходил до базы. Такую ошибку видит только
 * планировщик, то есть только настоящий Postgres.
 *
 * Отсюда правило: **запрос, собранный шаблоном `sql`, обязан быть исполнен
 * здесь.** Мок в таком запросе проверяет только то, что мы вызвали метод.
 */

/**
 * Куда подключаться.
 *
 * `TEST_DATABASE_URL` — своя переменная, а не общий `DATABASE_URL`, и это не
 * педантизм: набор чистит таблицы между тестами. Если он однажды подключится
 * к базе разработчика, тот потеряет данные, а если к продовой — потеряет их
 * не он один. Отдельное имя делает такую ошибку невозможной случайно.
 */
function connectionString(): string {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      [
        'TEST_DATABASE_URL не задан — интеграционные тесты не с чем запускать.',
        '',
        'Локально:',
        '  createdb amolie_test',
        '  TEST_DATABASE_URL=postgres://localhost:5432/amolie_test pnpm --filter @amolie/api test:int',
        '',
        'Набор намеренно падает, а не пропускается: тест, который молча',
        'не выполняется, — это зелёная галочка, ничего не доказывающая.',
      ].join('\n'),
    );
  }

  return url;
}

export type TestDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: TestDatabase | undefined;

/**
 * Поднять базу и накатить на неё миграции.
 *
 * Миграции те же, что в проде (`./drizzle`), и это существенно: тесты обязаны
 * проверять запросы против той схемы, которая действительно поедет, а не
 * против её пересказа в фикстуре.
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  pool = new Pool({ connectionString: connectionString(), max: 4 });
  db = drizzle(pool, { schema });

  await migrate(db, { migrationsFolder: './drizzle' });

  return db;
}

export function testDb(): TestDatabase {
  if (!db) throw new Error('setupTestDatabase() не вызван');
  return db;
}

export async function teardownTestDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

/**
 * Опустошить все таблицы между тестами.
 *
 * Список берётся из самой базы, а не пишется руками: перечисленный руками он
 * отстанет от схемы в тот день, когда появится новая таблица, и тест начнёт
 * видеть чужие строки — молча, потому что лишние данные обычно не роняют, а
 * искажают.
 *
 * `TRUNCATE ... CASCADE` одним оператором: он снимает вопрос порядка внешних
 * ключей, а `RESTART IDENTITY` возвращает счётчики, чтобы тесты не зависели от
 * того, сколько строк создали предыдущие.
 *
 * Таблица миграций исключена — иначе следующий тест обнаружил бы схему
 * «непринятой» и накатил бы её заново поверх существующей.
 */
export async function truncateAll(): Promise<void> {
  const database = testDb();

  const tables = await database.execute<{ tablename: string }>(sql`
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> '__drizzle_migrations'
  `);

  const names = tables.rows.map((row) => `"public"."${row.tablename}"`);
  if (names.length === 0) return;

  await database.execute(sql.raw(`truncate table ${names.join(', ')} restart identity cascade`));
}
