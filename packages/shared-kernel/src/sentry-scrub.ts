/**
 * Вычистка секретов и персональных данных из событий Sentry.
 *
 * Живёт в ядре, а не в каждом приложении, по той же причине, по какой там
 * живут правила сравнения телефонов: второй экземпляр этого правила разошёлся
 * бы с первым, и разошёлся бы молча — в сторону «отправили лишнего».
 *
 * Причина, по которой оно вообще нужно, специфична для AMOLIE: **у нас
 * секретные учётные данные лежат в адресах страниц.**
 *
 * - `/me/sign-in?token=…` — ссылка входа клиента. Открывает сессию.
 * - `/{slug}/booking/{token}` — секретный токен визита. Открывает статус,
 *   отмену и перенос; сегодня он же — половина замка на привязку записи к
 *   аккаунту (`claimByPublicToken`).
 * - `/organizations/{slug}/public-bookings/{token}` — тот же токен на стороне
 *   API.
 *
 * Sentry по умолчанию отправляет адрес с каждым событием. Без этой вычистки
 * первая же ошибка на такой странице отдала бы рабочий ключ третьей стороне и
 * оставила бы его в её журналах — то есть мы бы сами сделали то, от чего
 * защищались, вводя проверку почты при привязке визита.
 *
 * Правило намеренно тупое и всеохватное: **любой UUID в пути заменяется**, а
 * не только тот, который мы сейчас считаем токеном. Идентификаторы записей,
 * окон и клиентов в трассировке тоже не нужны — по ним группируют события, а
 * группировать надо по маршруту. Точечный список путей пришлось бы дополнять
 * при каждом новом маршруте, и однажды его бы не дополнили.
 */

/** UUID в любом регистре — то, чем у нас являются и токены, и идентификаторы. */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Параметры строки запроса, которые нельзя отдавать наружу ни в каком виде.
 *
 * `token` — ссылка входа и подтверждение почты; `code` и `secret` — на вырост,
 * дешевле перечислить сейчас, чем вспомнить после утечки.
 */
const SECRET_QUERY_KEYS = new Set(['token', 'code', 'secret', 'password']);

/**
 * Ключи, за которыми стоят персональные данные наших клиентов.
 *
 * Продукт специально не пишет их в логи; Sentry по умолчанию делает
 * обратное — собирает тела запросов и контекст. Список сверен с колонками
 * `bookings` и полями формы записи.
 */
const PII_KEYS = new Set([
  'phone',
  'guestPhone',
  'guest_phone',
  'email',
  'guestEmail',
  'guest_email',
  'guestName',
  'guest_name',
  'fullName',
  'full_name',
  'guestInstagram',
  'guest_instagram',
  'notes',
  'cancellationReason',
  'cancellation_reason',
  'p256dh',
  'auth',
  'endpoint',
]);

/** Чем заменяется вырезанное. Формат Sentry, чтобы читалось как их же метка. */
const MASK = '[Filtered]';

/**
 * Адрес без секретов: UUID из пути и опасные параметры запроса — прочь.
 *
 * Строка, а не `URL`: сюда приходят и полные адреса, и голые пути (`event
 * .request.url` бывает и тем и другим), и падать на этом нельзя — вычистка,
 * которая бросает исключение, отключает отправку всего события.
 */
export function scrubUrl(url: string): string {
  const [path, query] = splitQuery(url);
  const safePath = path.replace(UUID, MASK);

  if (query === undefined) return safePath;

  const safeQuery = query
    .split('&')
    .map((pair) => {
      const [key, ...rest] = pair.split('=');
      if (!key) return pair;
      const value = rest.join('=');
      if (SECRET_QUERY_KEYS.has(decodeURIComponent(key).toLowerCase())) {
        return `${key}=${MASK}`;
      }
      return value ? `${key}=${value.replace(UUID, MASK)}` : pair;
    })
    .join('&');

  return `${safePath}?${safeQuery}`;
}

/** Первый `?` делит адрес; фрагмент до Sentry не доходит и здесь не нужен. */
function splitQuery(url: string): [string, string | undefined] {
  const at = url.indexOf('?');
  return at === -1 ? [url, undefined] : [url.slice(0, at), url.slice(at + 1)];
}

/**
 * Рекурсивная вычистка произвольной структуры: значения по опасным ключам
 * заменяются целиком, строки — чистятся как адреса.
 *
 * Глубина ограничена: событие Sentry — это чужой объект произвольной формы, и
 * циклическая ссылка в нём не должна вешать отправку. Восьми уровней хватает
 * на `event.request.data.booking.items[0].service`, дальше смысла нет.
 */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === 'string') return scrubUrl(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = PII_KEYS.has(key) ? MASK : scrubValue(inner, depth + 1);
    }
    return out;
  }

  return value;
}
