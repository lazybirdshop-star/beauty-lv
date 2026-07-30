# API — Beauty.lv

Версия 0.2 (черновик для утверждения). Стиль API: **REST** (предложение — см. §9 об альтернативах).

## 1. Общие принципы

- Базовый путь: `/api/v1`. Версионирование через префикс пути.
- Формат данных: JSON (`Content-Type: application/json`), UTF-8.
- Все временные метки — ISO 8601 в UTC (`2026-07-30T14:00:00Z`), конвертация в локальный часовой пояс — на клиенте.
- Деньги в ответах API передаются как объект `{ amount: number (в центах), currency: string }`, никогда как float в валюте.
- Идентификаторы — UUID-строки.
- Аутентификация: `Authorization: Bearer <access_token>`.
- Мультиарендность: контекст организации определяется из токена/пути, клиент не может передать произвольный `organization_id` для чтения чужих данных.

## 2. Аутентификация и авторизация

### 2.1. Формат токенов

- `access_token` — JWT, TTL 15 минут, передаётся в заголовке.
- `refresh_token` — httpOnly secure cookie, TTL 30 дней, используется только эндпоинтом обновления токена.

### 2.2. Эндпоинты

| Метод | Путь                    | Описание                                                                                                                             |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST  | `/auth/register`        | Регистрация мастера/организации. **Требует `inviteCode`** (закрытая регистрация в MVP, см. [ARCHITECTURE.md](ARCHITECTURE.md) §10.1) |
| POST  | `/auth/login`           | Вход по паролю. Ответ включает `redirectUrl` (см. ниже)                                                                              |
| POST  | `/auth/otp/request`     | Запрос одноразового кода на телефон/email                                                                                            |
| POST  | `/auth/otp/verify`      | Подтверждение OTP → выдача токенов                                                                                                   |
| POST  | `/auth/refresh`         | Обновление access-токена по refresh-токену                                                                                           |
| POST  | `/auth/logout`          | Инвалидация refresh-токена                                                                                                           |
| POST  | `/auth/password/forgot` | Запрос сброса пароля                                                                                                                 |
| POST  | `/auth/password/reset`  | Установка нового пароля по токену сброса                                                                                             |

Пример `POST /auth/register` (регистрация мастера/организации, MVP — закрытая):

```json
{
  "inviteCode": "A7QK3M2P",
  "fullName": "Anna Bērziņa",
  "email": "anna@example.com",
  "password": "...",
  "organizationName": "Anna Nails Studio",
  "desiredSlug": "anna-nails"
}
```

Невалидный/использованный/истёкший код → `409` в формате из §3. При успехе — ответ как у `/auth/login` (см. ниже), пользователь уже авторизован в только что созданной организации.

Пример ответа `POST /auth/login`:

```json
{
  "accessToken": "...",
  "user": { "id": "uuid", "fullName": "Anna Bērziņa", "role": "master" },
  "redirectUrl": "https://anna-nails.beauty.lv/dashboard"
}
```

`redirectUrl` вычисляется backend'ом по правилам из [ARCHITECTURE.md](ARCHITECTURE.md) §3.6: есть организация → её поддомен; нет — остаётся `null` (пользователь остаётся на `beauty.lv`).

### 2.3. Роли и доступ

Проверка прав — на уровне Application-слоя backend (см. [ARCHITECTURE.md](ARCHITECTURE.md) §15). Общая матрица:

| Роль             | Доступ                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `client`         | Свои записи, свой профиль, публичные данные организаций                                           |
| `master`         | Данные своей организации: расписание, записи, услуги (в рамках прав, назначенных `admin`/`owner`) |
| `admin`/`owner`  | Полное управление организацией, сотрудниками, биллингом                                           |
| `platform_admin` | Административные эндпоинты `/admin/*`, доступ ко всем организациям                                |

## 3. Формат ошибок

Единый формат на основе RFC 7807 (Problem Details):

```json
{
  "type": "https://beauty.lv/errors/booking-slot-unavailable",
  "title": "Slot is no longer available",
  "status": 409,
  "detail": "Выбранный слот был занят другим клиентом.",
  "instance": "/api/v1/bookings",
  "traceId": "a1b2c3d4"
}
```

Коды состояния:

- `400` — некорректный запрос (валидация).
- `401` — не аутентифицирован.
- `403` — нет прав.
- `404` — сущность не найдена.
- `409` — конфликт (напр. слот занят, дублирующийся email).
- `422` — семантически некорректные данные.
- `429` — превышен rate limit.
- `500` — внутренняя ошибка.

## 4. Пагинация, фильтрация, сортировка

- Пагинация — курсорная для лент (записи, уведомления): `?cursor=<opaque>&limit=20`.
- Ответ со списком:

```json
{
  "data": [/* ... */],
  "meta": { "nextCursor": "opaque-string-or-null" }
}
```

- Фильтрация — явные query-параметры (`?status=confirmed&from=2026-08-01&to=2026-08-07`), без свободного query-языка в MVP.
- Сортировка — `?sort=starts_at:asc`.

## 5. Идемпотентность

Все небезопасные операции создания критичных сущностей (`POST /bookings`, `POST /payments`) принимают заголовок `Idempotency-Key`. Повторный запрос с тем же ключом в течение 24 часов возвращает результат первого выполнения без повторного создания сущности.

## 6. Ключевые группы эндпоинтов

### 6.1. Organizations & Profile

| Метод            | Путь                               | Описание                                      |
| ---------------- | ---------------------------------- | --------------------------------------------- |
| GET              | `/organizations/me`                | Данные текущей организации                    |
| PATCH            | `/organizations/me`                | Обновление профиля организации                |
| GET              | `/organizations/{slug}`            | Публичный профиль (для страницы бронирования) |
| POST             | `/organizations/me/locations`      | Добавление локации                            |
| GET/PATCH/DELETE | `/organizations/me/locations/{id}` | Управление локацией                           |
| GET              | `/organizations/me/members`        | Список сотрудников                            |
| POST             | `/organizations/me/members/invite` | Приглашение мастера                           |
| PATCH/DELETE     | `/organizations/me/members/{id}`   | Изменение роли / удаление сотрудника          |

### 6.2. Services Catalog

| Метод        | Путь                                   | Описание                                         |
| ------------ | -------------------------------------- | ------------------------------------------------ |
| GET          | `/organizations/me/services`           | Список услуг                                     |
| POST         | `/organizations/me/services`           | Создание услуги                                  |
| PATCH/DELETE | `/organizations/me/services/{id}`      | Изменение/деактивация услуги                     |
| GET          | `/organizations/me/service-categories` | Категории услуг                                  |
| GET          | `/organizations/{slug}/services`       | Публичный список услуг для страницы бронирования |

### 6.3. Scheduling

| Метод    | Путь                                 | Описание                                                                   |
| -------- | ------------------------------------ | -------------------------------------------------------------------------- |
| GET/PUT  | `/members/{id}/working-hours`        | Регулярное расписание мастера                                              |
| GET/POST | `/members/{id}/schedule-exceptions`  | Исключения (отпуск и т.п.)                                                 |
| GET      | `/organizations/{slug}/availability` | **Публичный.** Доступные слоты: параметры `serviceId`, `memberId?`, `date` |

Пример ответа `/organizations/{slug}/availability`:

```json
{
  "date": "2026-08-05",
  "timezone": "Europe/Riga",
  "slots": [
    { "memberId": "uuid", "startsAt": "2026-08-05T09:00:00Z", "endsAt": "2026-08-05T09:45:00Z" },
    { "memberId": "uuid", "startsAt": "2026-08-05T10:00:00Z", "endsAt": "2026-08-05T10:45:00Z" }
  ]
}
```

### 6.4. Bookings

| Метод | Путь                      | Описание                                                         |
| ----- | ------------------------- | ---------------------------------------------------------------- |
| POST  | `/bookings`               | Создание записи (клиент или гость)                               |
| GET   | `/bookings/{id}`          | Детали записи                                                    |
| GET   | `/bookings`               | Список записей (для мастера — расписание; для клиента — история) |
| PATCH | `/bookings/{id}/confirm`  | Подтверждение записи (мастер/авто)                               |
| PATCH | `/bookings/{id}/cancel`   | Отмена (клиентом или мастером, с указанием причины)              |
| PATCH | `/bookings/{id}/complete` | Отметка о завершении визита                                      |
| PATCH | `/bookings/{id}/no-show`  | Отметка о неявке                                                 |

Пример запроса `POST /bookings`:

```json
{
  "organizationSlug": "jane-nails-riga",
  "memberId": "uuid",
  "serviceIds": ["uuid-service-1"],
  "startsAt": "2026-08-05T09:00:00Z",
  "client": { "userId": "uuid" },
  "notes": null
}
```

или для гостя:

```json
{
  "organizationSlug": "jane-nails-riga",
  "memberId": "uuid",
  "serviceIds": ["uuid-service-1"],
  "startsAt": "2026-08-05T09:00:00Z",
  "guest": { "name": "Anna", "phone": "+371...", "email": "anna@example.com" }
}
```

### 6.5. Payments (Phase 2)

| Метод | Путь                             | Описание                                                |
| ----- | -------------------------------- | ------------------------------------------------------- |
| POST  | `/bookings/{id}/payments/intent` | Создание платёжного намерения (Stripe PaymentIntent)    |
| POST  | `/webhooks/stripe`               | Приём вебхуков от Stripe (подтверждение оплаты, refund) |
| POST  | `/bookings/{id}/payments/refund` | Возврат средств                                         |

### 6.6. Reviews (Phase 3)

| Метод | Путь                            | Описание                                  |
| ----- | ------------------------------- | ----------------------------------------- |
| POST  | `/bookings/{id}/review`         | Оставить отзыв (только после `completed`) |
| POST  | `/reviews/{id}/reply`           | Ответ мастера на отзыв                    |
| GET   | `/organizations/{slug}/reviews` | Публичные отзывы                          |

### 6.7. Notifications

| Метод     | Путь                           | Описание                        |
| --------- | ------------------------------ | ------------------------------- |
| GET       | `/me/notifications`            | Список уведомлений пользователя |
| PATCH     | `/me/notifications/{id}/read`  | Отметить прочитанным            |
| GET/PATCH | `/me/notification-preferences` | Настройки каналов уведомлений   |

### 6.8. Admin (platform_admin)

| Метод | Путь                               | Описание                                                                 |
| ----- | ---------------------------------- | ------------------------------------------------------------------------ |
| GET   | `/admin/organizations`             | Список всех организаций, фильтры, поиск                                  |
| PATCH | `/admin/organizations/{id}/status` | Приостановка/активация организации                                       |
| GET   | `/admin/metrics`                   | Агрегированные метрики платформы                                         |
| POST  | `/admin/invite-codes`              | Выпустить новый инвайт-код для регистрации мастера                       |
| GET   | `/admin/invite-codes`              | Список кодов с фильтром по статусу (`active`/`used`/`revoked`/`expired`) |
| PATCH | `/admin/invite-codes/{id}/revoke`  | Отозвать неиспользованный код                                            |

Пример `POST /admin/invite-codes`:

```json
{
  "intendedForName": "Anna Bērziņa",
  "intendedForContact": "anna@example.com",
  "expiresAt": "2026-09-01T00:00:00Z"
}
```

Ответ содержит сгенерированный `code`, который команда передаёт получателю вне системы (email/SMS/лично) — см. [ARCHITECTURE.md](ARCHITECTURE.md) §10.1.

## 7. Вебхуки (входящие)

- `POST /webhooks/stripe` — события платежей и подписок. Проверка подписи (`Stripe-Signature`), обработка идемпотентно по `event.id`.

## 8. Rate Limiting

- Публичные эндпоинты (`/auth/*`, `/bookings` создание, `/organizations/{slug}/availability`) — ограничение по IP и по номеру телефона/email (напр. 20 запросов/мин на IP).
- Ответ при превышении — `429` с заголовком `Retry-After`.

## 9. Альтернативы и открытые вопросы

1. **REST vs GraphQL:** REST выбран для MVP как более простой в кэшировании (важно для публичных страниц) и предсказуемый в контрактах. GraphQL может быть пересмотрен для Admin/Analytics модуля при росте сложности запросов (Phase 3+) — требует отдельного решения.
2. **OpenAPI-спецификация:** должна поддерживаться в актуальном состоянии параллельно с реализацией (генерация клиентских типов из схемы) — формат/инструмент фиксируется на этапе реализации.
3. **Realtime-обновления** (напр. live-обновление доступности слотов в UI мастера) — кандидат на WebSocket/SSE, вне MVP.
