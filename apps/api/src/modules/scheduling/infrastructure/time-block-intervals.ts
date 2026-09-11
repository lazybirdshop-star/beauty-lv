import { and, eq, gt, lt } from 'drizzle-orm';

import type { Database } from '../../../shared/database/database.module';
import { timeBlocks } from '../../../shared/database/schema/time-blocks';
import type { BlockInterval } from '../domain/time-block';

/**
 * Блоки человека, пересекающие отрезок `[from, to)`.
 *
 * Отдельной функцией, а не методом репозитория блоков: её спрашивают и
 * публикация окон, и создание записи, и перенос визита — внутри своих
 * транзакций, — а репозиторий блоков сам зависит от репозитория окон. Метод
 * на нём завёл бы круг зависимостей; функция над соединением — нет.
 *
 * `db` — соединение вызывающего, обычно его транзакция: проверка обязана
 * видеть то же состояние, в котором будет сделана вставка.
 */
export async function listBlockIntervals(
  db: Database,
  scope: { organizationMemberId: string },
  window: { from: Date; to: Date },
): Promise<BlockInterval[]> {
  return db
    .select({
      id: timeBlocks.id,
      organizationMemberId: timeBlocks.organizationMemberId,
      startsAt: timeBlocks.startsAt,
      endsAt: timeBlocks.endsAt,
    })
    .from(timeBlocks)
    .where(
      and(
        eq(timeBlocks.organizationMemberId, scope.organizationMemberId),
        lt(timeBlocks.startsAt, window.to),
        gt(timeBlocks.endsAt, window.from),
      ),
    );
}
