import { type SQL, ilike, or } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Сколько строк список отдаёт за раз, если страница не сказала иного.
 *
 * Пятьдесят, а не «все»: до сих пор `/admin/users` выгружал каждую строку
 * таблицы `users` и фильтровал их в браузере — на тысяче аккаунтов это
 * мегабайты трафика ради экрана, где видно восемь карточек.
 */
export const ADMIN_PAGE_SIZE = 50;

/** Потолок страницы. Выше — уже выгрузка, для неё будет отдельный экспорт. */
export const ADMIN_MAX_PAGE_SIZE = 100;

/**
 * Страница списка админки.
 *
 * `total` считается отдельным запросом по тому же условию: без него интерфейс
 * не может отличить «нашлось ровно 50» от «нашлось 50 из 4000», а это разные
 * экраны — во втором обязана быть кнопка «показать ещё».
 */
export interface AdminListPage<T> {
  items: T[];
  total: number;
}

export interface AdminListRange {
  limit: number;
  offset: number;
}

/**
 * Поиск по нескольким колонкам одной строкой.
 *
 * `%` и `_` в запросе экранируются: без этого поиск по «100%» означал бы
 * «что угодно», а мастер, набравшая подчёркивание, получила бы случайные
 * совпадения вместо пустого списка. `ilike` вместо `lower(...) like` —
 * регистронезависимость это работа базы, а не приложения.
 */
export function searchCondition(query: string | undefined, columns: PgColumn[]): SQL | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
  return or(...columns.map((column) => ilike(column, pattern)));
}
