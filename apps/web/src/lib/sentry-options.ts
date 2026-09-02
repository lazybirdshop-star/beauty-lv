import { scrubUrl, scrubValue } from '@amolie/shared-kernel';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

/**
 * Общие настройки Sentry для всех трёх сред веба: браузер, сервер, edge.
 *
 * Одним модулем, а не тремя копиями: настройки здесь — не украшение, а
 * граница того, что уходит третьей стороне. Три копии однажды разъехались бы,
 * и разъехались бы молча, в сторону «отправили лишнего».
 */

/**
 * Адрес проекта в Sentry. Публичен по устройству — он и так попадает в
 * браузерный бандл, — но в репозитории его нет: репозиторий открытый, и
 * лишний адрес в нём это приглашение засорить чужую квоту.
 *
 * Пусто — Sentry молчит. Ровно то, что нужно локальной разработке и тестам:
 * ни одного события с чужой машины.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Доля запросов, попадающих в трассировку.
 *
 * Десятая часть, а не всё. Трассировки — самая дорогая часть квоты, а нужны
 * они для распределения времени ответа, где выборка и работает. Ошибки при
 * этом отправляются **все**: они и есть то, ради чего Sentry ставится.
 */
const TRACES_SAMPLE_RATE = 0.1;

/**
 * Настройки, общие для браузера, сервера и edge.
 *
 * `sendDefaultPii: false` — самое важное здесь и оно же значение по
 * умолчанию: продукт специально не пишет телефоны и почты в логи (это
 * проверено аудитом безопасности), и включать обратную привычку у стороннего
 * сборщика было бы отменой того решения. Указано явно, потому что мастер
 * установки Sentry ставит `true`, и следующий, кто запустит его поверх, не
 * должен незаметно это перевернуть.
 */
export const sentryCommonOptions = {
  dsn: SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  /* Окружение приходит от Vercel; локальный запуск называет себя сам, чтобы
     случайное событие с машины разработчика не смешалось с продом. */
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  /* Один проект на веб и API — их различает эта метка. Разделить на два
     проекта можно позже, не трогая код: сменится только DSN. */
  initialScope: { tags: { app: 'web' } },
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
};

/**
 * Последняя точка, где событие ещё наше.
 *
 * Вычищается всё, где у нас бывают секреты и персональные данные: адрес,
 * строка запроса, имя транзакции (у клиентских переходов это сырой путь) и
 * тело запроса. Смотри `sentry-scrub.ts` в ядре — там причина.
 */
function scrubEvent<T extends ErrorEvent | { transaction?: string; request?: unknown }>(
  event: T,
  _hint?: EventHint,
): T {
  const request = (event as { request?: Record<string, unknown> }).request;
  if (request) {
    if (typeof request.url === 'string') request.url = scrubUrl(request.url);
    if (typeof request.query_string === 'string') {
      request.query_string = scrubUrl(`?${request.query_string}`).slice(1);
    }
    if (request.data !== undefined) request.data = scrubValue(request.data);
    if (request.headers) request.headers = scrubValue(request.headers) as Record<string, string>;
  }

  const transaction = (event as { transaction?: string }).transaction;
  if (typeof transaction === 'string') {
    (event as { transaction?: string }).transaction = scrubUrl(transaction);
  }

  return event;
}

/**
 * Хлебные крошки — вторая дорога, по которой адрес уезжает наружу: каждый
 * переход между страницами и каждый `fetch` кладут сюда свой URL.
 */
function scrubBreadcrumb<T extends { data?: Record<string, unknown> | undefined }>(
  breadcrumb: T,
): T {
  if (breadcrumb.data) {
    breadcrumb.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
  }
  return breadcrumb;
}
