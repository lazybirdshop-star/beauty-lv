import { DESIGN_PRESET_KEYS, defaultPageDesign, type DesignPresetKey } from '@amolie/shared-kernel';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { organizations } from '../shared/database/schema/organizations';

/**
 * Переодеть показательный кабинет в другой мир — на один снимок.
 *
 * Существует ради блока «Одна страница. Разные лица» на лендинге: там стоят
 * три телефона с одной и той же страницей записи в трёх оформлениях, и
 * снимать их надо с одних и тех же данных. Иначе выходит то, что вышло в
 * прошлый раз: три снимка, сделанные в разное время с разных пустых
 * кабинетов, где у одного «43 свободных окна», у другого «46», и оба
 * показывают ближайшую запись на полночь.
 *
 * Правит только `neve@amolie.test` — организацию, которую собирает `demo.ts`.
 * Живой мастер этим скриптом не переодевается ни при каких аргументах:
 * адрес зашит, а не приходит параметром.
 *
 *   pnpm --filter @amolie/api db:demo-look aura
 *
 * Возврат к исходному облику — тот же скрипт с `aura`: именно его ставит
 * `demo.ts`, и именно в нём кабинет живёт между съёмками.
 */
const SLUG = 'neve-ashgrove';

async function main(): Promise<void> {
  const requested = process.argv[2];

  if (!requested || !(DESIGN_PRESET_KEYS as readonly string[]).includes(requested)) {
    console.error(
      `Нужен ключ мира: ${DESIGN_PRESET_KEYS.join(' | ')}\n` +
        `  pnpm --filter @amolie/api db:demo-look aura`,
    );
    process.exit(1);
  }

  const preset = requested as DesignPresetKey;
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/amolie',
  });
  const db = drizzle(pool);

  /* Черновик Студии трогать нечего: снимается опубликованная страница, и
     подменять мастеру её незавершённую работу скрипт не вправе. */
  const updated = await db
    .update(organizations)
    .set({ designPresetKey: preset, pageDesign: defaultPageDesign(preset) })
    .where(eq(organizations.slug, SLUG))
    .returning({ slug: organizations.slug, key: organizations.designPresetKey });

  if (updated.length === 0) {
    console.error(`Показательного кабинета «${SLUG}» нет. Сначала: db:demo`);
    process.exit(1);
  }

  console.log(JSON.stringify({ slug: SLUG, designPresetKey: preset }, null, 2));
  await pool.end();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
