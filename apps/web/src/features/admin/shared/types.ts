/**
 * Общий словарь всех списков админки.
 *
 * Статус аккаунта был объявлен дважды — в мастерах и в пользователях — с
 * одинаковым набором значений. Один enum на два экрана: списки показывают
 * одно и то же поле одной и той же таблицы, и разойтись они не имеют права.
 */
export type AccountStatus = 'active' | 'blocked';

export type SystemRole = 'client' | 'master' | 'platform_admin';

/**
 * Страница списка.
 *
 * `total` — сколько строк подходит под фильтр целиком, а не сколько пришло.
 * Без него экран не может отличить «это все» от «это первые пятьдесят», а
 * значит не может честно решить, показывать ли кнопку «Показать ещё».
 */
export interface AdminListPage<T> {
  items: T[];
  total: number;
}

/** Что уходит на сервер в любом списке админки. */
export interface AdminListParams {
  query?: string;
  status?: AccountStatus;
  limit: number;
  offset: number;
}

/** Размер страницы. Совпадает с умолчанием API (`ADMIN_PAGE_SIZE`). */
export const ADMIN_PAGE_SIZE = 50;

/**
 * Параметры запроса — в строку адреса, без пустых значений.
 *
 * `undefined` и пустая строка не попадают в URL вовсе: `?query=` на стороне
 * API это заданный пустой поиск, а не его отсутствие, и разбирать эту разницу
 * в каждом контроллере — лишняя работа для того, чего клиент мог не отправлять.
 */
export function toSearchParams(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
}
