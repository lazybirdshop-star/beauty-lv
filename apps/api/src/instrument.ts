import { scrubUrl, scrubValue } from '@amolie/shared-kernel';
import * as Sentry from '@sentry/nestjs';

/**
 * Инициализация Sentry — **до всего остального**.
 *
 * Отдельный файл, а не строки в `main.ts`, потому что порядок здесь не
 * стилистический: автоматическая обвязка Sentry подменяет методы http, pg и
 * самого Nest в момент их загрузки. Инициализация после первого `import`
 * прикладного кода успевает опоздать ровно к тому, что нужно наблюдать, и
 * молчит об этом. Отсюда правило: `import './instrument'` — первая строка
 * `main.ts`, и ничего перед ней.
 *
 * Что именно наблюдаем — сказано в `sentry-scrub.ts` ядра и в комментариях
 * ниже. Коротко: API на Fly не хранит журнал (`fly logs` отдаёт последние
 * минуты), поэтому исключение ночью не оставляет следа вовсе. Sentry здесь —
 * не «наблюдаемость вообще», а память.
 */

/**
 * Пусто — Sentry молчит и ничего не отправляет.
 *
 * Так и должно быть у локального запуска, у тестов и у чужой машины:
 * переменная необязательная (`env.validation.ts`), и её отсутствие это
 * рабочее состояние, а не недосмотр конфигурации.
 */
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  /* Продукт специально не пишет телефоны, почты и тела писем в логи — это
     проверено аудитом безопасности. Включать обратную привычку у стороннего
     сборщика значило бы отменить то решение чужими руками. */
  sendDefaultPii: false,
  /* Ошибки отправляются все; трассировки — десятая часть. Они нужны для
     распределения времени ответа, где выборка и работает, а стоят дороже
     всего остального вместе взятого. */
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV ?? 'development',
  /* Один проект Sentry на веб и API — различает их эта метка. */
  initialScope: { tags: { app: 'api' } },

  /*
   * Последняя точка, где событие ещё наше.
   *
   * Вырезаются секреты из адреса: у нас токен визита стоит **в пути**
   * (`/organizations/:slug/public-bookings/:token`), а он открывает статус,
   * отмену и перенос чужой записи. Отправить его третьей стороне значило бы
   * отменить сегодняшний замок по почте.
   */
  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeSendTransaction(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data) {
      breadcrumb.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
    }
    return breadcrumb;
  },
});

/**
 * Общая вычистка для ошибок и трассировок — форма события у них одна.
 *
 * Тип берётся у самого SDK (`Sentry.ErrorEvent`), а не описывается своим:
 * поля события задаёт Sentry, и собственное описание разошлось бы с ним на
 * первом же обновлении — причём разошлось бы молча, пропустив мимо вычистки
 * новое поле с адресом.
 */
function scrubEvent<T extends Sentry.ErrorEvent | Sentry.Event>(event: T): T {
  const request = event.request;
  if (request) {
    if (typeof request.url === 'string') request.url = scrubUrl(request.url);
    if (typeof request.query_string === 'string') {
      request.query_string = scrubUrl(`?${request.query_string}`).slice(1);
    }
    if (request.data !== undefined) request.data = scrubValue(request.data);
    if (request.headers) {
      request.headers = scrubValue(request.headers) as Record<string, string>;
    }
    /* Куки — это `access_token`, то есть действующая сессия. Не «вычистить
       по ключам», а убрать целиком: полезного в них для разбора нет. */
    delete request.cookies;
  }

  if (typeof event.transaction === 'string') event.transaction = scrubUrl(event.transaction);

  return event;
}
