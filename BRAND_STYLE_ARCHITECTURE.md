---
name: AMOLIE Brand Style Architecture
version: 1.1-draft
description: Архитектура «один движок — шесть визуальных миров»: разделение shared product logic и style-specific visual composition для публичной страницы мастера. Спецификация до реализации; код не меняется
status: Ожидает утверждения. Не реализовано.
---

# AMOLIE — Архитектура фирменных стилей

> **Статус: проект. Код приложения этот документ не меняет.** Реализация
> начинается после утверждения, шагами §12 — каждый шаг независимо
> поставляем и не ломает работающее.

> **Ревизия 1.1 — по итогам архитектурного ревью.** Направление
> подтверждено; внесены шесть уточнений (код по-прежнему не изменён):
>
> 1. M0 дополнен **скриншот-харнессом** визуальных базлайнов Soft и Poster —
>    регрессии живых миров ловятся до переноса компонентов (§12, §16).
> 2. Шаг «Контакты» записи — **единая общая реализация** для всех миров;
>    шесть копий формы не создаётся никогда (§3, §6, §7.6).
> 3. **`ShapeSpec` удалён из v1**: декларативное описание формы не имеет
>    runtime-потребителя и способно разойтись с JSX (§11).
> 4. Реестр приведён к **одной канонической модели**: мир = один модуль =
>    один dynamic boundary; motion — данные внутри объекта, а не компонент
>    (§8.2).
> 5. Добавлено **правило роста контрактов**: движок растёт только ради
>    доменных состояний; визуальное состояние живёт в композициях (§7.7).
> 6. Зафиксирован принцип **shared logic ≠ shared DOM**: абстракции ради
>    общего JSX запрещены (§1.1).

Цель: **ONE PRODUCT · ONE BUSINESS LOGIC · SIX DISTINCT VISUAL WORLDS.**

Документ отвечает на десять вопросов постановки: архитектура (§1–§3),
инвентаризация существующего кода (§4–§6), интерфейсы (§7), реестр (§8),
выбор композиции в Design Studio (§9), системы движения и формы (§10–§11),
миграция (§12), объём и риски (§13), открытые решения (§14), критерии
приёмки (§15), визуальные базлайны (§16).

Связанные документы: [BRAND_STYLES.md](BRAND_STYLES.md) — чем миры являются;
[DESIGN_STUDIO.md](DESIGN_STUDIO.md) — как мастер до них доходит;
[DESIGN_AUDIT.md](DESIGN_AUDIT.md) — аудит, подтвердивший проблему;
[ARCHITECTURE.md](ARCHITECTURE.md) — общая архитектура монорепозитория.

---

## 0. Доказательная база: что показал аудит кода

Проверка фактического состояния `apps/web/src/features/public-profile/`:

1. **Два параллельных дерева.** `components/` (плакатный мир, ~2 100 строк)
   и `soft/` (мягкий мир, ~2 200 строк). Ветвление маршрутов — строковое:
   `org.designPresetKey !== 'poster' ? <Soft…/> : <Poster…/>` в
   `layout.tsx`, `page.tsx`, `prices/page.tsx`, `contacts/page.tsx`.

2. **Четыре стиля — токен-вариации Soft.** `editorial`, `organic`,
   `neo-glass` и `soft-studio` рендерят одно и то же дерево `soft/` с
   разными значениями `--panel-radius`/`--card-radius`/`--surface-*`.
   Композиционно они неотличимы — в монохроме без фотографий это один мир.

3. **Два стиля — boolean-ветки внутри Soft.** `minimal` и `luxury`
   протянуты флагами через `soft/booking-calendar.tsx` (644 строки),
   `soft/booking-sheet.tsx` (726), `soft/booking-steps.tsx` (259),
   `soft/org-header.tsx` (298), `soft/org-nav.tsx` (139). Каждый компонент
   знает о всех мирах сразу; добавление седьмого стиля — это правка шести
   файлов с тернарниками.

4. **Бизнес-логика записи уже продублирована.** Машина состояний записи
   (шаги, маршрут, квитанция, гонки загрузки окон, оптимистичный статус)
   написана дважды: `components/booking-sheet.tsx` (621 строка) и
   `soft/booking-sheet.tsx` (726) — и копии **уже разошлись** в деталях
   (индикатор прогресса плаката всегда показывает четыре сегмента, мягкий
   фильтрует шаг допродаж; это рассинхрон поведения, а не стиля). Это
   главный аргумент за движок: дублирование существует сегодня, и оно
   дорожает с каждым миром. Форма гостя продублирована тем же образом:
   `components/booking-steps.tsx` и `soft/booking-steps.tsx` (§7.6).

5. **Чистая логика уже отделена и стиле-независима** — её нужно только
   перенести: `types.ts`, `data.ts`, `api.ts`, `booking-cart.ts`,
   `build-calendar.ts`, `group-by-day.ts`, `booking-status.ts`.

6. **Токен-слой работает и проверен.** `ThemeStyle` пишет ~50 переменных
   на `:root` сервером (первый кадр уже в палитре мастера; портал Radix
   наследует). Палитры измерены и закреплены тестом `theme.test.ts`.
   Слой цвета/типографики трогать не нужно — он остаётся фундаментом.

7. **Хореография уже частично токенизирована** (`--ease-style`, `--dur-*`,
   `--anim-sheet-in/out`, `--motion-scale`), но keyframes-реестр один на всех
   (`sheet-panel-in/out` в `globals.css`), а пер-стилевые анимации
   (`anim-minimal-crossfade`, семейство `anim-luxury-*`) размазаны по
   глобальному файлу и жёстко привязаны к классам внутри чужих компонентов.

8. **`apps/web` не имеет тест-раннера.** Тесты есть только в
   `shared-kernel`. Извлечение движка — первое место, где веб-приложению
   нужны unit-тесты (см. §12, шаг M0). Визуальных базлайнов нет вовсе —
   перенос двух живых миров сегодня проверяется только глазами (§16).

---

## 1. Архитектурный принцип

```
┌─────────────────────────────────────────────────────────────┐
│ ROUTES (app/[slug]/(public))                                │
│ Тонкие: данные → resolveBrandStyleKey → CompositionHost     │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ REGISTRY (registry/)                                        │
│ Ключ стиля → lazy-загружаемая композиция. Единственное      │
│ место, знающее все миры.                                    │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ COMPOSITIONS (compositions/<style>/)                        │
│ Только представление и хореография. Никогда не ходят в API, │
│ не считают доступность, не валидируют. Получают             │
│ data / state / actions через контрактные пропсы.            │
└──────────────▲──────────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────────┐
│ ENGINE (engine/)                                            │
│ Типы, данные, API, календарная математика, корзина, машина  │
│ состояний записи, a11y-хелперы. Не импортирует ничего из    │
│ compositions. Не знает, что стили существуют.               │
└─────────────────────────────────────────────────────────────┘
```

**Правило зависимостей одностороннее:** `routes → registry → compositions →
contracts → engine`. Обратных рёбер нет. Engine не импортирует JSX миров;
композиции не импортируют друг друга (общие визуальные куски — только через
`shared/`, и это решение фиксируется код-ревью, а не по умолчанию).

### 1.1. Shared logic ≠ shared DOM

Общая логика не означает общую разметку. **Запрещено создавать абстракции
только ради того, чтобы все шесть миров использовали одинаковый JSX.** Если
Minimal нужна другая разметка, чем у Soft, — у него другая разметка. Если
Neo Glass нужна другая композиция календаря — он её получает. Если Organic
нужна другая композиция hero — она у него своя. Если Luxury нужна другая
подача записи — она у него своя.

Общим становится только то, что является доменом: данные, API, логика
записи, доступность, валидация, локализация, примитивы доступности,
доменное состояние (полный список — §3, правило роста — §7.7). Осознанное
исключение в пользу общего DOM ровно одно: шаг «Контакты» записи (§7.6) —
и оно сделано по прямому требованию к форме, а не по умолчанию. Каждое
пересечение миров в `shared/` — решение ревью, а не значение по умолчанию.

**Шестое измерение стиля.** BRAND_STYLES.md §2 определяет стиль пятью
измерениями: палитра, типографика, поверхности, движение, форма. Эта
архитектура добавляет шестое — **композицию** — и перераспределяет носителей:

| Измерение   | Носитель после рефакторинга                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Палитра     | Токены (`ThemeStyle`), как сейчас. Всегда токены — overrides мастера и гарантии контраста живут здесь                 |
| Типографика | Токены шрифтовых слотов + display-поведение; композиция вольна задавать кегли/насыщенность своей разметкой            |
| Поверхности | Токены значений (`--panel-radius` и кин) **и/или** собственная геометрия композиции — мир может не читать токен вовсе |
| Движение    | **Per-style хореография** (§10): свои keyframes, свои springs, свои жесты                                             |
| Форма       | **Per-style геометрия** (§11): реальная разметка, не только радиусы. Декларативных зеркал разметки нет                |
| Композиция  | **Per-style дерево компонентов** — новое измерение, ради которого всё затевается                                      |

Тест узнаваемости постановки (монохром, без фото, с чужим текстом) проходит
именно шестым измерением: идентичность живёт в композиции, форме, иерархии,
ритме и движении — не в красках.

---

## 2. Целевая структура каталогов

Структура следует действующей feature-based организации
(`features/README.md`, ARCHITECTURE.md §5): всё живёт внутри фичи
`public-profile`, маршруты остаются тонкими.

```
apps/web/src/features/public-profile/
│
├── engine/                        # SHARED. Ни одного импорта из compositions.
│   ├── types.ts                   #   ← перенос из корня фичи без изменений
│   ├── data.ts                    #   ← серверная выборка (React cache)
│   ├── api.ts                     #   ← клиентские вызовы (guest booking, availability)
│   ├── booking-cart.ts            #   ← totals, addons, группировка каталога
│   ├── build-calendar.ts          #   ← месячная математика (+ локализация шапки недели, P1-5)
│   ├── group-by-day.ts
│   ├── booking-status.ts
│   ├── use-schedule-calendar.ts   #   НОВОЕ: состояние страницы-календаря (§7.2)
│   ├── use-booking-flow.ts        #   НОВОЕ: машина состояний записи, одна копия (§7.3)
│   └── a11y.ts                    #   НОВОЕ: общие aria-подписи/построители (§7.5)
│
├── contracts/                     # Только типы. Стабильный API «движок ↔ миры».
│   ├── composition.ts             #   BrandStyleComposition — корневой контракт (§7.1)
│   ├── calendar.ts                #   CalendarData / CalendarState / CalendarActions
│   ├── booking.ts                 #   BookingFlow / BookingSheetProps / StepViewProps
│   ├── sections.ts                #   Header/Nav/ServiceList/Contacts пропсы
│   └── chrome.ts                  #   SheetChrome, MotionSpec (§10)
│
├── compositions/                  # STYLE-SPECIFIC. Один каталог = один мир =
│   │                              # один модуль: index.ts + root.tsx (§8.2).
│   ├── soft/                      #   ← нынешнее soft/ минус ветки minimal/luxury
│   ├── poster/                    #   ← нынешнее components/
│   ├── minimal/                   #   ← извлечение веток из soft-дерева
│   ├── luxury/                    #   ← извлечение веток из soft-дерева
│   ├── neo-glass/                 #   НОВЫЙ мир (пространственная композиция)
│   ├── organic/                   #   НОВЫЙ мир (асимметрия, тактильность)
│   └── editorial/                 #   Решение §14.3 — свой мир или алиас poster
│
├── registry/
│   ├── brand-style.ts             #   BrandStyleKey, алиасы, fallback (§8.1)
│   ├── brand-style-registry.ts    #   CompositionRoot: один dynamic boundary на мир (§8.2)
│   ├── composition-context.tsx    #   провайдер/хук доступа к слотам мира (§8.2)
│   └── *-host.tsx                 #   тонкие клиентские хосты маршрутов (§8.2)
│
└── shared/                        # Визуально общее — сознательно короткий список (§6)
    ├── theme-style.tsx            #   ← перенос из components/ без изменений
    ├── sheet-base.tsx             #   НОВОЕ: headless-поведение шторки (Radix) без хрома (§7.4)
    ├── contacts-step.tsx          #   НОВОЕ: единый шаг «Контакты» записи (§7.6)
    ├── booking-followup.tsx       #   ← .ics/Google Calendar; стиль передаёт классы кнопок
    ├── booking-status-card.tsx    #   ← страница статуса записи (v1 — общая, §14.4)
    └── ambient-backdrop.tsx       #   ← световой фон для стеклянных миров
```

Маршруты `app/[slug]/(public)/*` перестают импортировать `soft/*` и
`components/*` напрямую — только registry и engine.

Каталог `soft/service-picker.tsx` (0 строк, мёртвый файл) удаляется на шаге M2.

Скриншот-харнесс живёт вне фичи: `apps/web/tests/visual/` (базлайны) и
`apps/web/scripts/visual-baselines.mjs` (захват/сравнение) — спецификация
в §16.

---

## 3. Что остаётся shared — гарантии постановки

Ничто из этого списка не дублируется между мирами **никогда**:

| Область                 | Где живёт                                                               | Сегодня                                                                  |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Запись (state machine)  | `engine/use-booking-flow.ts`                                            | ⚠️ дублируется в двух деревьях — главная находка аудита                  |
| Календарная математика  | `engine/build-calendar.ts`                                              | ✅ уже общая                                                             |
| Доступность (fetch)     | `engine/api.ts` + `engine/data.ts`                                      | ✅ уже общая                                                             |
| Состояние календаря     | `engine/use-schedule-calendar.ts`                                       | ⚠️ дублируется в двух календарях                                         |
| Корзина/допродажи       | `engine/booking-cart.ts`                                                | ✅ уже общая                                                             |
| Типы домена             | `engine/types.ts`                                                       | ✅ уже общие                                                             |
| Локализация             | `lib/i18n` (I18nProvider/useT/useLocale/fmt)                            | ✅ общая; + фикс P1-5 (шапка недели из `Intl`) в engine                  |
| Палитра/статусы/шрифты  | `shared/theme-style.tsx` + shared-kernel                                | ✅ общая, не трогаем                                                     |
| Поведение диалога       | `shared/sheet-base.tsx` (Radix: фокус-ловушка, ESC, скролл-лок, портал) | ⚠️ сейчас сшито с хромом в `ui/sheet.tsx`                                |
| Шаг «Контакты» записи   | `shared/contacts-step.tsx` (+ правила валидации в engine)               | ⚠️ дублируется: `soft/booking-steps.tsx`, `components/booking-steps.tsx` |
| Фоллоу-ап записи        | `shared/booking-followup.tsx`                                           | ✅ уже общий (получает классы от мира)                                   |
| Маршрутизация, auth, БД | вне фичи                                                                | ✅ вне scope                                                             |

Контрактный запрет, который держит архитектуру: **композиция не вызывает
`api.ts`/`data.ts` напрямую и не содержит `fetch`** — данные и действия
приходят пропсами. Линтер-правило (custom ESLint `no-restricted-imports` для
`compositions/**`) закрепляет запрет на шаге M2.

---

## 4. Инвентаризация: существующий код → движок

Перенос без изменения поведения; визуальные файлы в список не входят.

| Файл (сегодня)                                                                                                    | Куда                                                     | Изменения при переносе                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                                                                                                        | `engine/types.ts`                                        | нет                                                                                                                                      |
| `data.ts`                                                                                                         | `engine/data.ts`                                         | нет                                                                                                                                      |
| `api.ts`                                                                                                          | `engine/api.ts`                                          | нет                                                                                                                                      |
| `booking-cart.ts`                                                                                                 | `engine/booking-cart.ts`                                 | нет                                                                                                                                      |
| `build-calendar.ts`                                                                                               | `engine/build-calendar.ts`                               | + локализуемая шапка недели через `Intl.DateTimeFormat(locale, { weekday: 'short' })` вместо `WEEKDAY_HEADERS_RU` (закрывает аудит P1-5) |
| `group-by-day.ts`                                                                                                 | `engine/group-by-day.ts`                                 | нет                                                                                                                                      |
| `booking-status.ts`                                                                                               | `engine/booking-status.ts`                               | нет                                                                                                                                      |
| state-машина `soft/booking-sheet.tsx` + `components/booking-sheet.tsx`                                            | `engine/use-booking-flow.ts`                             | **слияние двух копий в одну**; расхождения поведения — решения §14.1                                                                     |
| state `soft/booking-calendar.tsx` + `components/booking-calendar.tsx` (месяц, выбор даты/слота, overrides, facts) | `engine/use-schedule-calendar.ts`                        | слияние; facts-проекция (услуги/окна/ближайшее) общая                                                                                    |
| форма гостя: `soft/booking-steps.tsx` + `components/booking-steps.tsx` (шаг «Контакты»)                           | `shared/contacts-step.tsx`; правила валидации — в engine | **слияние двух копий в одну**; подача параметризуется классами/слотами мира (§7.6)                                                       |
| aria-подписи слотов/дней, размазанные по двум календарям                                                          | `engine/a11y.ts`                                         | единые построители `slotAriaLabel()`, `dayAriaLabel()` — словесная согласованность миров бесплатно                                       |

---

## 5. Инвентаризация: что становится style-specific

Каждая строка — компонент контракта `BrandStyleComposition` (§7.1). В
скобках — источник стартового кода.

| Слот композиции                  | Назначение                                    | Soft                                | Poster                                                             | Minimal              | Luxury               | Neo Glass                              | Organic                            |
| -------------------------------- | --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ | -------------------- | -------------------- | -------------------------------------- | ---------------------------------- |
| `Shell`                          | Каркас страницы: расположение hero/панели/нав | перенос (`layout.tsx` panel-world)  | перенос (`layout.tsx` split)                                       | из веток layout      | из веток layout      | **новая**: слоистая парящая композиция | **новая**: асимметричная потоковая |
| `Header`                         | Hero: имя, фото, действия, медиа-обработка    | перенос `soft/org-header.tsx`       | перенос `components/org-header.tsx`                                | из ветки `minimal`   | из ветки `luxury`    | новая                                  | новая                              |
| `Nav`                            | Навигация разделов                            | перенос (pill-track)                | перенос (правило)                                                  | из ветки             | из ветки             | новая                                  | новая                              |
| `CalendarSection`                | Факты + сетка дат + слоты + CTA               | перенос `soft/booking-calendar.tsx` | перенос `components/booking-calendar.tsx`                          | из веток             | из веток             | новая                                  | новая                              |
| `DayCell`                        | Ячейка дня (геометрия/метки мира)             | внутри секции                       | внутри секции                                                      | внутри секции        | внутри секции        | новая                                  | новая                              |
| `ServiceListSection`             | Прайс: группы, карточки, детальный лист       | перенос `soft/service-list.tsx`     | перенос `components/service-list.tsx` + `service-detail-sheet.tsx` | из веток             | из веток             | новая                                  | новая                              |
| `BookingSheet`                   | Хром и сцены записи поверх `BookingFlow`      | перенос `soft/booking-sheet.tsx`    | перенос `components/booking-sheet.tsx`                             | из веток             | из веток             | новая                                  | новая                              |
| `ContactsSection`                | Контакты                                      | перенос `soft/contacts-card.tsx`    | перенос `components/contacts-card.tsx`                             | из веток             | из веток             | новая                                  | новая                              |
| `SheetChrome`                    | Панель шторки: ручка/шов/край/закрытие        | из `ui/sheet.tsx`                   | из `ui/sheet.tsx`                                                  | своя (без ручки)     | своя (шампань-шов)   | своя (парящая)                         | своя                               |
| `MotionSpec`                     | Хореография мира (§10)                        | `motion.css` + springs              | своя                                                               | своя (есть в ветках) | своя (есть в ветках) | новая                                  | новая                              |
| `EmptyState`/`Loading`/`Success` | Состояния внутри секций и шторки              | перенос                             | перенос                                                            | из веток             | из веток (церемония) | новая                                  | новая                              |

`DayCell` — не отдельный файл-слот по умолчанию, а часть `CalendarSection`
мира; вынесена в таблицу, потому что постановка называет её поимённо: у мира
должна быть свобода дать ячейке собственную геометрию (круг, квадрат,
сквircle, камень) и собственные метки (точка, кольцо, засечка, число
окон).

Переходы страниц и вход секций (`page entrance`, `section reveals`) — части
`Shell` и секций мира, работающие через его `MotionSpec`.

Сцены шагов записи внутри шторки — внутренние компоненты мира, **кроме шага
«Контакты»**: он общий для всех миров (§7.6) и в таблицу слотов поэтому не
входит.

---

## 6. Инвентаризация: что остаётся визуально общим

Сознательно короткий список — каждый пункт обоснован:

1. **`shared/theme-style.tsx`** — эмиссия токенов на `:root`. Цвет, статусы,
   шрифтовые слоты — всегда токены: через них текут overrides мастера и
   измеренные контрасты; портал Radix наследует `:root`. Композиции
   **никогда не хардкодят цвет** — только `var(--…)`.
2. **`shared/sheet-base.tsx`** — headless-шторка: Radix Dialog (портал,
   фокус-ловушка, ESC, `aria`, скролл-лок, кап высоты, sticky-подвал вне
   скролла). Поведение, от которого зависит доступность, реализуется один
   раз; мир получает `SheetChrome`-слоты (§7.4).
3. **`shared/contacts-step.tsx`** — единственная реализация шага «Контакты»
   записи: поля имени, телефона и Instagram, валидация, ошибки,
   `role="alert"`, состояние отправки, поведение и aria полей. Шести копий
   формы не существует никогда; мир управляет подачей через классы и слоты
   (§7.6), но не дублирует логику.
4. **`shared/booking-followup.tsx`** — «добавить в календарь»: уже принимает
   классы кнопок от вызывающего мира. Остаётся.
5. **`shared/booking-status-card.tsx`** — страница статуса записи
   (`/booking/[token]`): утилитарный экран «факт и действия», не витрина.
   v1 — общий, читающий токены. Решение зафиксировано в §14.4.
6. **`shared/ambient-backdrop.tsx`** — свет для стекла; миры без blur его
   не запрашивают (как сейчас).
7. **Базовые контролы кабинета (`components/ui/*`)** — вне территории
   публичной страницы; публичные миры их не используют, кроме `Button` как
   опорного примитива CTA — мир волен заменить его своим.

`service-detail-sheet.tsx` сегодня существует только у плаката; у мягкого
мира детали услуги открываются не так. После миграции детальный лист —
внутреннее дело каждого мира (слот `ServiceListSection`).

---

## 7. Интерфейсы между движком и композициями

Контракты — чистые типы в `contracts/`. Композиции зависят только от них и
от типов engine; engine о контрактах знает лишь то, что его хуки возвращают
совместимые структуры.

### 7.1. Корневой контракт

```ts
// contracts/composition.ts
export interface BrandStyleComposition {
  /** Каркас страницы: hero, панель, фон, первый кадр. */
  Shell: ComponentType<ProfileShellProps>;
  Header: ComponentType<HeaderProps>;
  Nav: ComponentType<NavProps>;
  CalendarSection: ComponentType<CalendarSectionProps>;
  ServiceListSection: ComponentType<ServiceListSectionProps>;
  ContactsSection: ComponentType<ContactsSectionProps>;
  BookingSheet: ComponentType<BookingSheetProps>;
  /** Хореография мира — данные, не компонент (§10). */
  motion: MotionSpec;
}
```

Частичные композиции запрещены: мир реализует все слоты, иначе тип не
сходится — реестр не даст собрать «полмира». (Во время миграции недостающие
слоты мира временно заполняются ссылками на soft-слоты — это механизм
алиасов §8.3, а не частичность.)

### 7.2. Календарь: `data` / `state` / `actions`

```ts
// contracts/calendar.ts
export interface CalendarData {
  org: PublicOrganization;
  month: CalendarMonth; // engine/build-calendar
  weekdayHeaders: string[]; // локализованные, engine (P1-5)
  slotMonths: ReadonlySet<string>; // месяцы с окнами — подсказка пейджингу
  facts: ScheduleFacts; // { servicesCount, availableCount, nearestSlot, nearestLabel }
  todayKey: string;
}

export interface CalendarState {
  visible: { year: number; month: number };
  monthLabel: string;
  selectedDate: string | undefined;
  selectedDay: DaySlots | undefined;
  selectedSlot: PublishedSlot | null;
  canGoBack: boolean;
  isEmpty: boolean; // days.length === 0 → EmptyState мира
}

export interface CalendarActions {
  prevMonth(): void;
  nextMonth(): void;
  selectDate(date: string): void;
  selectSlot(slotId: string): void;
  openBooking(): void; // открыть BookingSheet с carried preference
  bookNearest(): void; // жест «ближайшее окно» (luxury-ivory, poster-поле)
}

export interface CalendarSectionProps {
  data: CalendarData;
  state: CalendarState;
  actions: CalendarActions;
  /** Шторку рендерит секция мира: она же получает flow через хук-хост (§7.3). */
}
```

Хук движка:

```ts
// engine/use-schedule-calendar.ts
export function useScheduleCalendar(args: {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
}): { data: CalendarData; state: CalendarState; actions: CalendarActions };
```

Он инкапсулирует: overrides после записи, стартовый месяц от первого окна,
запрет листания в прошлое, выбор даты/слота, facts, локализованные
форматтеры, `todayKey`. Сегодня эта логика продублирована в двух
календарях — станет одной копией.

### 7.3. Запись: `BookingFlow`

```ts
// contracts/booking.ts
export interface BookingFlow {
  state: {
    open: boolean;
    step: BookingStep; // 'services' | 'addons' | 'time' | 'contacts'
    route: BookingStep[]; // фактический маршрут этого визита
    selectedIds: string[];
    activeDate: string | null;
    status: 'idle' | 'submitting' | 'done' | 'error' | 'blocked';
    conflict: string;
    guest: { name: string; phone: string; instagram: string };
    receipt: BookingReceipt | null; // чек-факт, не производная от живого состояния
  };
  derived: {
    selectedServices: PublicService[];
    serviceGroups: ServiceGroup[]; // каталог, сгруппированный для пикера
    addons: PublicService[];
    totals: CartTotals;
    days: SlotDay[];
    loadingSlots: boolean;
    chosenSlot: PublishedSlot | null;
    canContinue: boolean;
    awaiting: boolean; // receipt.status === 'pending'
    nextStep: BookingStep | null; // подпись кнопки называет следующий шаг
  };
  actions: {
    toggleService(id: string): void;
    pickDate(date: string): void;
    pickSlot(slotId: string): void;
    setGuestName(v: string): void;
    setGuestPhone(v: string): void;
    setGuestInstagram(v: string): void;
    goNext(): void;
    goBack(): void;
    submit(): Promise<void>;
    close(): void; // включает отложенный reset после анимации
  };
}

export interface BookingSheetProps {
  flow: BookingFlow;
  org: PublicOrganization;
  chrome: SheetChrome; // хром мира поверх shared/sheet-base (§7.4)
}
```

`use-booking-flow.ts` — слияние двух существующих машин. В него уходят:
маршрутизация шагов с пропусками (услуги из карточки, окно из календаря,
допродажи по наличию), доверие к carried-окну до опровержения выборкой,
гонка `cancelled` при смене корзины, receipt-факт, статусы
`done/error/blocked`, отложенный reset. Расхождения копий решаются один раз
и навсегда (§14.1).

Сцены шагов мира (`ServicesStep`, `AddonsStep`, `TimeStep`, успех) —
внутренние компоненты его `BookingSheet`, не слоты реестра: мир владеет
своей шторкой целиком. Общие куски шагов (строка услуги с тиком, чип
времени) мир реализует сам — это и есть его геометрия. **Единственное
исключение — шаг «Контакты»**: его логика и разметка полей общие
(`shared/contacts-step.tsx`, §7.6); мир получает только его подачу.

### 7.4. Шторка: поведение общее, хром мира

```ts
// contracts/chrome.ts
export interface SheetChrome {
  /** Классы/разметка панели: радиусы, край, фон, тень мира. */
  panelClassName: string;
  /** Ручка: рисуется миром; null — шов несёт кромку (Minimal, Luxury). */
  Handle: ComponentType | null;
  /** Позиция и вид закрытия; по умолчанию — общая кнопка X. */
  CloseButton?: ComponentType;
  /** Вход/выход панели и оверлея — имена keyframes мира (его motion.css). */
  panelInClass: string;
  panelOutClass: string;
  overlayClassName?: string;
}

// shared/sheet-base.tsx — headless:
export function SheetBase(props: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  footer?: ReactNode;
  chrome: SheetChrome;
  children: ReactNode;
}): JSX.Element;
```

Radix-поведение (портал, фокус, ESC, скролл-лок, `aria-describedby`,
кап высоты, подвал вне скролла) живёт в `SheetBase` один раз. Мир не может
случайно сломать доступность шторки — он получает только её внешний вид и
движение.

### 7.5. A11y как часть движка

Свобода разметки не должна означать шесть диалектов доступности. В
`engine/a11y.ts` — построители подписей (`dayAriaLabel(cell, t)`,
`slotAriaLabel(slot, t)`), конвенции ролей и чек-лист композиции
(фокус-кольца, 44px, `aria-pressed`, `role="alert"` на ошибках). Чек-лист
проверяется на ревью каждого мира; подписи — общие функцией, поэтому
словесная часть доступности не расходится между мирами.

### 7.6. Шаг «Контакты» — общий навсегда

Форма гостя — это домен: одни поля, одни правила, одна доступность, одна
отправка. **Шесть независимых копий формы не создаётся ни в каком мире.**
Сегодня копии уже две (`soft/booking-steps.tsx` и
`components/booking-steps.tsx`) — на M1/M2 они сливаются в одну.

```tsx
// shared/contacts-step.tsx
export interface ContactsStepClasses {
  form?: string;
  field?: string; // обёртка поля: label + control + error
  label?: string;
  input?: string;
  error?: string;
  hint?: string;
}

export interface ContactsStepSlots {
  /** Декоративная обёртка поля мира (шампань-рамка, утопленное стекло,
      льняная линейка). По умолчанию — без обёртки. */
  FieldChrome?: ComponentType<{ children: ReactNode; invalid: boolean }>;
}

export function ContactsStep(props: {
  flow: BookingFlow; // guest, status, conflict, actions — из движка
  classes?: ContactsStepClasses;
  slots?: ContactsStepSlots;
}): JSX.Element;
```

Компонент отвечает за: поля `name` / `phone` / `instagram`; валидацию
(правила — из engine/shared-kernel, телефон — `phone.ts`); отображение и
озвучивание ошибок (`role="alert"`, `aria-invalid`, `aria-describedby`);
состояние отправки (`flow.state.status === 'submitting'` блокирует поля);
кегль поля 16px и зону нажатия 44px (законы продукта); поведение фокуса и
автозаполнения. Мир получает внешний вид: свои классы полей, лейблов,
подсказок и ошибок (`classes`) и опциональный `FieldChrome` (`slots`).
Разметка внутри `FieldChrome` — свобода мира; само поле (label, input,
error) и его поведение — одни на продукт.

### 7.7. Правило роста контрактов

> **Движок записи может расти только для поддержки новых доменных/
> бизнес-состояний. Чисто визуальное, презентационное состояние остаётся
> внутри композиции мира.**

Доменные состояния (живут в engine): выбранная услуга, выбранные допродажи,
выбранная дата, выбранное время, данные клиента, статус записи — и всё, что
влияет на данные, деньги или доступность.

Визуальные состояния (живут в `compositions/<style>/`): раскрытая карточка,
фаза кинематографического reveal, материализация стеклянной поверхности,
фаза декоративного перехода, состояние занавеса Luxury.

Визуальное состояние **не добавляется** в общий движок только потому, что
оно нужно одному из Brand Styles. Проверка на ревью одним вопросом:
«меняет ли это состояние данные, деньги или доступность?» — если нет, ему
место в композиции мира.

---

## 8. Brand Style Registry

### 8.1. Ключи и разрешение

```ts
// registry/brand-style.ts
export const BRAND_STYLE_KEYS = [
  'soft',
  'poster',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
] as const; // + 'editorial' по решению §14.3

export type BrandStyleKey = (typeof BRAND_STYLE_KEYS)[number];

/** designPresetKey (БД, 8 значений) → композиция. */
export function resolveBrandStyleKey(designPresetKey: string | null): BrandStyleKey {
  switch (designPresetKey) {
    case 'soft-studio':
    case 'soft':
      return 'soft'; // классика и бренд — одна композиция, разные токены
    case 'poster':
      return 'poster';
    case 'minimal':
      return 'minimal';
    case 'luxury':
      return 'luxury';
    case 'organic':
      return 'organic';
    case 'neo-glass':
      return 'neo-glass';
    case 'editorial':
      return /* §14.3 */ 'poster';
    default:
      return 'soft'; // неизвестный ключ → дефолт продукта
  }
}
```

Классический `soft` и брендовый `soft-studio` — одна композиция (это и есть
доказательство, что палитра ≠ композиция). Неизвестный ключ падает в `soft`,
а не в ошибку — существующие страницы мастеров не ломаются никогда.

### 8.2. Каноническая модель реестра

Одна модель, без альтернатив: **мир = один модуль = один dynamic boundary.**
Никаких per-slot `dynamic()` и никаких dynamic-импортов данных.

Мир собирает полный объект композиции в своей точке входа:

```ts
// compositions/luxury/index.ts (client module)
import type { BrandStyleComposition } from '../../contracts/composition';
import { motion } from './motion'; // MotionSpec — данные, не компонент
import { Shell } from './shell';
// … Header, Nav, CalendarSection, ServiceListSection, ContactsSection, BookingSheet

export const composition: BrandStyleComposition = {
  Shell,
  Header,
  Nav,
  CalendarSection,
  ServiceListSection,
  ContactsSection,
  BookingSheet,
  motion,
};
```

и экспортирует тонкий root-провайдер:

```tsx
// compositions/luxury/root.tsx (client)
'use client';
import { CompositionProvider } from '../../registry/composition-context';
import { composition } from './index';

export default function LuxuryRoot({ children }: { children: ReactNode }) {
  return <CompositionProvider value={composition}>{children}</CompositionProvider>;
}
```

Реестр знает только ключи и root-загрузчики; это единственное место,
знающее все миры:

```tsx
// registry/brand-style-registry.ts (client module)
'use client';
import dynamic from 'next/dynamic';
import type { BrandStyleKey } from './brand-style';

const ROOTS: Record<BrandStyleKey, ComponentType<{ children: ReactNode }>> = {
  soft: dynamic(() => import('../compositions/soft/root')),
  poster: dynamic(() => import('../compositions/poster/root')),
  minimal: dynamic(() => import('../compositions/minimal/root')),
  luxury: dynamic(() => import('../compositions/luxury/root')),
  organic: dynamic(() => import('../compositions/organic/root')),
  'neo-glass': dynamic(() => import('../compositions/neo-glass/root')),
};

export function CompositionRoot(props: { styleKey: BrandStyleKey; children: ReactNode }) {
  const Root = ROOTS[props.styleKey];
  return <Root>{props.children}</Root>;
}
```

Хосты маршрутов читают слоты из контекста, а не из собственных
dynamic-импортов:

```tsx
// registry/composition-context.tsx (client)
'use client';
const CompositionContext = createContext<BrandStyleComposition | null>(null);

export function useComposition(): BrandStyleComposition {
  const ctx = useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition вне CompositionRoot');
  return ctx;
}
```

```tsx
// client: registry/calendar-host.tsx
'use client';
export function CalendarHost({ org, initialSlots }: Props) {
  const { CalendarSection } = useComposition();
  const calendar = useScheduleCalendar({ org, initialSlots });
  return <CalendarSection data={calendar.data} state={calendar.state} actions={calendar.actions} />;
}
```

Маршруты остаются серверными и тонкими:

```tsx
// server: app/[slug]/(public)/layout.tsx
const org = await getOrganizationBySlug(slug);
return (
  <CompositionRoot styleKey={resolveBrandStyleKey(org.designPresetKey)}>
    <ShellHost org={org}>{children}</ShellHost>
  </CompositionRoot>
);
```

```tsx
// server: app/[slug]/(public)/page.tsx
const org = await getOrganizationBySlug(slug); // cache: без лишних запросов
const slots = await getPublishedSlots(slug);
return <CalendarHost org={org} initialSlots={slots} />;
```

Свойства модели:

- **Один чанк на мир.** Слоты статически импортированы `index.ts` мира,
  поэтому bundler собирает их в чанк root-модуля. На страницу приезжает
  один мир + общий engine; шесть миров не раздувают бандл друг друга
  (бюджет чанка в CI — R3).
- **SSR-первый кадр сохраняется.** `next/dynamic` с SSR (по умолчанию)
  рендерит root на сервере, CSS мира приезжает с его чанком в SSR-выдаче —
  занавес Luxury и прочие first-frame-церемонии работают (проверяется на
  M-шаге мира и скриншот-харнессом §16).
- **Motion — данные, не компонент.** `MotionSpec` приезжает внутри объекта
  композиции тем же чанком. `dynamic()` для данных не используется никогда.
- **Полнота по типу.** Мир без слота не соберётся: `BrandStyleComposition`
  требует все слоты («полмира» невозможно, §7.1).
- **Одна точка входа.** Layout и все страницы route-группы живут под одним
  `CompositionRoot` — нет ни дублирующих boundary, ни водопадов чанков,
  ни двух трактовок реестра.

Почему не per-slot `dynamic()`: слоты мира нужны вместе уже в пределах
одной route-группы (layout + страница), раздельные boundary плодили бы
водопады и дубли чанков; данные (`motion`) компонентами не являются и через
`dynamic()` проходить не должны; единственный boundary даёт предсказуемый
SSR и единственную точку отказа.

### 8.3. Алиасы как механизм миграции

Реестр допускает алиас на уровне загрузчика на переходный период:

```ts
// minimal ещё не приземлился — работает на soft-композиции, чанк общий
minimal: dynamic(() => import('../compositions/soft/root')),
```

Мир продолжает работать на чужой композиции, пока его собственная не
приземлилась. Благодаря этому миграция — очередь независимых шагов, а не
big bang (§12). Алиас — легальное конечное состояние: миру не запрещено
делиться композицией осознанно (как `soft` ↔ `soft-studio` токенами).

---

## 9. Как Design Studio выбирает композицию

Механика выбора **не меняется**: мастер хранит решения
(`designPresetKey`, `themePresetKey`, `fontPresetKey`, `themeOverrides`),
резолвер выводит значения при рендере (DESIGN_STUDIO.md §2.5 «хранятся
решения, не краски»). Меняется то, что стоит за ключом дизайна:

1. **Каталог стилей** в `appearance-screen.tsx` группируется по мирам
   (композициям), а не по «панель vs плакат». Каждый мир — карточка с
   живой миниатюрой.
2. **Миниатюра мира** рендерится тем же реестром: сокращённый
   `CalendarSection`/`Header` мира на фикстурных данных, в монохромной
   рамке-подложке палитры. Миниатюра не может устареть относительно мира —
   это тот же код. (Лёгкий вариант на старте: статичный SVG-силуэт мира;
   живые миниатюры — шаг M8.)
3. **Живой холст Студии** (DESIGN_STUDIO.md §3) рендерит полную композицию
   через тот же `CompositionRoot` с реальными данными мастера — drift
   между предпросмотром и страницей исключён конструкцией.
4. **Ручки внутри мира** (акцент, фон, фото, display-поведение) продолжают
   писать только в разрешённые токены — механика §2.2–§2.4 Студии
   сохраняется целиком. Геометрия и хореография мира мастеру не продаются:
   «геометрией этого мира владеет стиль» — ровно та формулировка, которую
   Студия уже показывает.

---

## 10. Система движения: per-style хореография

Общего `sheet-panel-in` на всех больше нет. Каждый мир владеет тремя
слоями движения:

```
compositions/<style>/
├── motion.css     # keyframes мира: sheet, overlay, reveal, page entrance,
│                  # success-церемония, календарные переходы
└── motion.ts      # MotionSpec: springs/transition-конфиги для motion/react
```

```ts
// contracts/chrome.ts
export interface MotionSpec {
  /** Класс входа/выхода панели шторки (keyframes мира). */
  sheetInClass: string;
  sheetOutClass: string;
  /** Переход месяца/шага: 'crossfade' | 'wipe' | 'spatial' | 'none'. */
  stepTransition: 'crossfade' | 'wipe' | 'spatial' | 'fade' | 'none';
  /** Конфиги для motion/react там, где мир говорит пружинами. */
  springs?: {
    sheet: { type: 'spring'; stiffness: number; damping: number; mass?: number };
    press: { scale: number; duration?: number };
    reveal: { y?: number; opacity?: number; blur?: number; stagger?: number };
  };
}
```

Матрица хореографии (спецификации — BRAND_STYLES.md §10 и постановка):

| Мир       | Характер                        | Sheet                          | Переходы шагов/месяца      | Press            | Page entrance             |
| --------- | ------------------------------- | ------------------------------ | -------------------------- | ---------------- | ------------------------- |
| Soft      | gentle spring / soft reveal     | spring up, 24px + лёгкий scale | мягкий reveal 600ms        | scale 0.97       | плавный подъём            |
| Poster    | editorial wipe / decisive       | жёсткий wipe снизу, без scale  | wipe/срез, 200ms           | мгновенный/цвет  | срез поля                 |
| Minimal   | precise fade / tiny translation | 24px на opacity, 220ms         | crossfade 120ms (уже есть) | без scale (цвет) | точное появление          |
| Neo Glass | spatial depth / spring / blur   | spring + depth-blur вход       | spatial: y+scale+blur      | spring-отклик    | слои собираются в глубину |
| Organic   | fluid / flowing                 | flowing rise, мягкая кривая    | плавное перетекание        | мягкий spring    | поступательное течение    |
| Luxury    | cinematic / slow / deliberate   | 520/280ms, глубокий dim 60%    | fade 500ms (уже есть)      | brightness 0.92  | занавес 640ms (уже есть)  |

Правила:

- **Reduced-motion остаётся глобальным законом**: единый
  `@media (prefers-reduced-motion: reduce)` гасит все `anim-*` миров (как
  сейчас), springs в `motion/react` — через `useReducedMotion` в общих
  хелперах. Мир не может отменить закон, потому что не владеет им.
- **Токены темпа сохраняются** (`--ease-style`, `--dur-*`, `--motion-scale`):
  это ручка интенсивности Студии и SSR-первый кадр; keyframes мира читают
  `var()` внутри — механика уже доказана на `sheet-panel-in`.
- Семейство `anim-luxury-*` и `anim-minimal-crossfade` уезжает из
  `globals.css` в `compositions/luxury/motion.css` и
  `compositions/minimal/motion.css` на шагах M3–M4. `globals.css` держит
  только продуктовые (не мировые) анимации.

## 11. Система формы: геометрия живёт в разметке мира

Токены радиусов остаются эмитироваться (`--panel-radius` и кин — их читают
soft-мир и overrides), но мир больше не обязан строить геометрию из них.

**`ShapeSpec` в v1 не существует.** Декларативное описание формы
(`avatar: 'arch'`, `edge: 'seam'`…) не имеет runtime-потребителя и при этом
способно разойтись с реальной разметкой: спецификация может говорить
«круг», а компонент — рендерить арку. Такое описание — второй источник
правды, поддерживаемый вручную, — удалено из архитектуры до появления
реального потребителя. Единственный носитель формы — JSX/CSS композиции
мира. (`MotionSpec`, напротив, остаётся: его потребители реальны —
`SheetBase` читает классы входа/выхода, хелперы motion/react читают
springs, хосты — тип перехода шага.)

Места, которым «нужно знать силуэт», решаются без декларативного слоя:
превью Студии — живой миниатюрой через реестр (M8; до этого — честные
статичные SVG-силуэты, §9), статус-страница — читает токены (§14.4).

Реальная геометрия живёт в разметке мира: Poster — прямоугольные поля и
линейки; Minimal — инженерное семейство 8–16px и волосяные линейки; Neo
Glass — парящие слои и squircle; Organic — асимметрия, неровные пропорции,
арки, возможные `border-radius` с разными углами и маски; Luxury —
архитектурные прямоугольники с церемониальными швами. `clip-path`/маски
мира (напр. cut-out портрет Soft, маска растворения) — внутри его
компонентов.

---

## 12. План миграции

Каждый шаг — отдельный коммит/деплой с полным циклом проверок
(`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, визуальный
прогон обоих живых миров — до переносов компонентов он выполняется
скриншот-харнессом §16, а не глазами). Откат любого шага не трогает
остальные.

**M0. Тестовая и визуальная опора.**
а) Поднять Vitest в `apps/web` (конфиг уровня shared-kernel).
Характеризационные тесты на существующие чистые функции (`booking-cart`,
`build-calendar`, `group-by-day`) — до их переноса.
б) Скриншот-харнесс визуальных базлайнов (§16): детерминированные снимки
Soft и Poster **до любого переноса компонентов**, детектор регрессий для
M2–M4.
_Выход: зелёный `pnpm test` в web; 20 базлайнов двух живых миров в git;
рисков нет._

**M1. Engine extraction.** Перенос §4 в `engine/`; создание
`use-schedule-calendar` и `use-booking-flow`; обе существующие пары
календарь+шторка (soft и poster) переводятся на хуки; дублированные тела
удаляются. Расхождения копий разрешаются по §14.1. Плюс фикс P1-5 в
`engine/build-calendar.ts`. **Визуально — ноль изменений** (контроль —
харнессом §16).
_Выход: две машины состояний → одна; тесты хуков (маршрут шагов, гонка
`cancelled`, receipt, reset); ручной прогон записи в обоих мирах._
_Это самый рискованный шаг — деньги проходят через него; см. §13._

**M2. Contracts + Registry.** `contracts/*`, `registry/*`, `SheetBase`,
`shared/contacts-step.tsx` (слияние двух копий формы гостя);
`soft/` → `compositions/soft/`, `components/` → `compositions/poster/`
(механический перенос, импорты через алиасы). Маршруты и layout переходят
на `resolveBrandStyleKey` + `CompositionRoot` + хосты; строковые тернарники
`!== 'poster'` исчезают. ESLint `no-restricted-imports`: compositions не
импортируют `engine/api|data` и друг друга. Удаляется мёртвый
`service-picker.tsx`.
_Выход: архитектура стоит; рендер идентичен текущему — контроль
скриншот-харнессом (soft/poster страницы до пикселя)._

**M3. Minimal composition.** Перед извлечением — базлайны minimal тем же
харнессом (§16). Ветки `minimal` выносятся из soft-дерева в
`compositions/minimal/` (header/nav/calendar/sheet/хром + `motion.css`).
Soft-дерево очищается от тернарников minimal. _Выход: два чистых мира
вместо одного ветвистого; рендер minimal идентичен базлайнам._

**M4. Luxury composition.** Аналогично: базлайны luxury до извлечения;
`anim-luxury-*` уезжают в `compositions/luxury/motion.css`, занавес — в
luxury `Shell`.
_Выход: soft-дерево свободно от обоих чужих миров._

**M5. Neo Glass composition.** Первый по-настоящему новый мир:
пространственная композиция, слоистость, spring+blur хореография,
squircle-геометрия. До включения в реестре — алиас на soft (страницы
neo-glass работают как сейчас).

**M6. Organic composition.** Асимметричная потоковая композиция, fluid
motion, тактильная геометрия.

**M7. Editorial.** Решение §14.3: свой мир или осознанный алиас poster.

**M8. Design Studio.** Живые миниатюры миров через реестр, группировка
каталога по мирам; чистка `theme-brand.ts` от «замороженных» значений,
которые больше не несут нагрузки; финальный проход документации
(BRAND_STYLES §10–11 ссылаются на новые носители).

Параллелизуемость: M3/M4 независимы; M5/M6/M7 независимы после M2.

---

## 13. Объём и риски

### 13.1. Объём (оценка по измеренному коду)

| Шаг | Содержание                                                                             | Оценка  |
| --- | -------------------------------------------------------------------------------------- | ------- |
| M0  | Vitest в web + характеризация pure-функций + скриншот-харнесс и фикстурный сид         | 1 д     |
| M1  | Два хука движка + слияние копий + тесты + P1-5                                         | 2–3 д   |
| M2  | Контракты, реестр, SheetBase, ContactsStep, перенос двух деревьев, хосты, lint-границы | 2–3 д   |
| M3  | Minimal: базлайны + извлечение веток + motion.css                                      | 1–1.5 д |
| M4  | Luxury: базлайны + извлечение веток + церемонии                                        | 1–1.5 д |
| M5  | Neo Glass: новый мир (композиция + motion + shape)                                     | 3–4 д   |
| M6  | Organic: новый мир                                                                     | 3–4 д   |
| M7  | Editorial (по решению)                                                                 | 0.5–3 д |
| M8  | Студия, чистка, документация                                                           | 1–2 д   |

Итого: **≈ 16–23 рабочих дня** при последовательном прохождении;
M3+M4 и M5–M7 распараллеливаются.

По строкам: engine ~900 (из них ~600 — новая сборка существующей логики),
contracts ~250, registry+hosts ~200, SheetBase ~120, ContactsStep ~200
(слияние двух существующих копий), харнесс ~150 (один скрипт с режимами
capture/check). Композиции: soft и poster — перенос ~4 300 существующих
строк; minimal/luxury — извлечение ~1 200 строк веток; neo-glass/organic —
~1 500–2 000 новых строк каждый.

### 13.2. Реестр рисков

| #   | Риск                                                           | Вер. | Ущерб | Митигация                                                                                                                                                             |
| --- | -------------------------------------------------------------- | ---- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Регрессия записи при слиянии машин (M1) — денежный путь        | С    | Выс.  | Слияние до визуальных троганий; характеризационные тесты до переноса; расхождения копий — явные решения §14.1; ручной e2e обоих миров; деплой M1 отдельным релизом    |
| R2  | Дрейф a11y между мирами (шесть разметок одного сценария)       | С    | Сред. | `engine/a11y.ts` общие подписи; `SheetBase` удерживает диалоговое поведение; `ContactsStep` удерживает форму; чек-лист контрактов на ревью каждого мира               |
| R3  | Рост бандла шестью мирами                                      | Н    | Сред. | Один dynamic boundary на мир (§8.2) — грузится один чанк мира + engine; бюджет чанка в CI (size-limit)                                                                |
| R4  | Первый кадр: CSS мира из async-чанка опаздывает (FOUC/занавес) | Н    | Сред. | dynamic+SSR включает CSS чанка в выдачу; проверка первого кадра каждого мира на его M-шаге; критические keyframes первого кадра можно поднять в `globals.css` точечно |
| R5  | Миниатюры Студии расходятся с реальными страницами             | С    | Низ.  | Миниатюра = тот же реестр (M8); до M8 — честные статичные силуэты без обещания точности                                                                               |
| R6  | Полумиграция: миры живут на алиасах дольше плана               | С    | Низ.  | Алиасы — легальное конечное состояние (миру не запрещено делиться композицией); burn-down в TASKS.md                                                                  |
| R7  | Классические ключи (`soft`, `poster`, старые темы) сломаны     | Н    | Выс.  | Алиас-таблица §8.1 покрывает все 8 ключей; fallback → soft; тест на `resolveBrandStyleKey`                                                                            |
| R8  | Overrides мастера перестают доезжать до какого-то мира         | Н    | Сред. | Запрет хардкода цвета в композициях (lint + ревью); визуальный прогон с overrides на M-шаге мира                                                                      |
| R9  | Регрессия плакатного мира — главного актива (аудит §7)         | Н    | Выс.  | M2 — чистый перенос без правок разметки; скриншот-харнесс §16: базлайны сняты на M0 до переноса, `visual:check` на каждом M-шаге                                      |
| R10 | Флаки скриншот-сравнений (шрифты, антиалиасинг, анимации)      | С    | Низ.  | Эмуляция reduced-motion, ожидание `document.fonts.ready`/networkidle, порог 0.1%, маскирование динамики; калибровка порога на M0; diff-кадры как артефакт             |

### 13.3. Что осознанно НЕ делаем

- Не вводим state-manager (zustand присутствует в зависимостях, но машина
  записи — локальное состояние; хуков достаточно, добавлять слой — против
  KISS).
- Не разносим `engine` в отдельный пакет: граница держится импортами и
  lint-правилами; пакет — преждевременная церемония для одного потребителя.
- Не трогаем дашборд/кабинет: там один продуктовый мир, система стилей —
  территория публичной страницы.
- Не вводим декларативный реестр формы (`ShapeSpec`): без
  runtime-потребителя это второй источник правды, способный разойтись с
  JSX (§11).
- Не создаём шесть копий шага «Контакты» — одна реализация, мир управляет
  подачей (§7.6).
- Не делаем per-slot `dynamic()` и не загружаем данные (motion) как
  компоненты — одна каноническая модель реестра (§8.2).
- Не добавляем визуальные состояния миров в движок записи (§7.7).
- Не вводим тяжёлый screenshot-фреймворк: библиотека playwright +
  pixelmatch закрывают задачу базлайнов (§16); Vitest остаётся для
  unit-тестов.
- Не создаём абстракции, чтобы принудить все миры к общему JSX (§1.1).

---

## 14. Открытые решения (нужно утверждение)

### 14.1. Расхождения двух копий машины записи (для M1)

При слиянии `components/booking-sheet.tsx` и `soft/booking-sheet.tsx`
обнаруженные расхождения решаем так (предлагается; утвердить):

1. **Прогресс шагов:** плакат всегда показывает 4 сегмента, soft фильтрует
   шаг допродаж из счётчика. → **Единое: сегменты фактического маршрута**
   (как у soft — честнее), форма индикатора — дело мира.
2. **Загрузка окон:** обе копии уже идентичны по гонке `cancelled` —
   переносится как есть.
3. **`slotChosen`/carried-окно:** семантика soft («доверять до
   опровержения выборкой») новее — принимается единой.

### 14.2. Ключи композиций vs ключи дизайнов

Постановка называет шесть миров: SOFT, POSTER, MINIMAL, NEO GLASS, ORGANIC,
LUXURY. В данных существуют 8 `designPresetKey` (шесть брендовых +
классика `poster`/`soft`). Предлагается: композиции — по шести мирам
постановки; `soft-studio`→`soft`, `poster`→`poster`; судьба `editorial` —
§14.3. Токенные классики (`blush-rose` и др.) продолжают работать — они
палитры, не композиции.

### 14.3. Editorial: свой мир или алиас poster

Editorial сегодня рендерится soft-деревом с квадратными токенами — в
монохроме он неотличим от soft. Варианты:

- **A (рекомендуется):** на миграции алиас `editorial → poster`
  (плоские поля, линейки, капс — ближайшая школа), затем отдельным шагом —
  собственная «журнальная» композиция (полосы, колонки, сетка разворота),
  отличная от плакатного сплит-скрина. Меняет живой вид editorial-страниц —
  требует явного «да».
- **B:** оставить алиас на `soft` до своей композиции (текущий вид
  сохраняется, но узнаваемости нет).

### 14.4. Страница статуса записи

`/booking/[token]` — утилитарный экран. Предлагается v1: общий компонент на
токенах мира (как сейчас). Стилевые церемонии статуса — отдельным
улучшением после M8, если потребуется.

### 14.5. Порядок новых миров

Предлагается Neo Glass раньше Organic: его «стеклянная» семья ближе к
существующему коду (blur/raisedAlpha уже в токенах) — первый новый мир
дешевле и прокладывает практику для более свободного Organic.

---

## 15. Критерии приёмки архитектуры

1. Один `use-booking-flow` обслуживает все миры; строк «дублированной
   машины» в кодовой базе нет (поиск по `fetchAvailability` даёт одно
   место — engine). Шаг «Контакты» существует в одной реализации —
   `shared/contacts-step.tsx`.
2. Маршруты и layout не содержат строковых ветвлений по `designPresetKey` —
   только `resolveBrandStyleKey` + `CompositionRoot` и хосты. Реестр —
   одна каноническая модель §8.2: один dynamic boundary на мир, motion —
   данные внутри объекта композиции.
3. Добавление седьмого мира = новый каталог в `compositions/` + строка в
   реестре. Существующие файлы миров не правятся.
4. Монохром-тест: скриншоты шести миров в grayscale без изображений —
   различимы по композиции (проверка на M-шагах M5–M7; снимки — тем же
   харнессом §16).
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` зелёные на
   каждом шаге; `visual:check` зелёный для Soft/Poster на M1–M2 (рендер
   идентичен базлайнам, снятым до переноса); бандл главного маршрута растёт
   не более чем на размер одного чанка мира.
6. Правило роста контрактов (§7.7) подтверждено ревью каждого шага: в
   engine не добавлено ни одного визуального состояния мира; `ShapeSpec` и
   иные декларативные зеркала JSX отсутствуют.

---

## 16. Скриншот-харнесс визуальных базлайнов (M0)

Цель — **не вечное попиксельное равенство**, а раннее обнаружение
непреднамеренных визуальных регрессий Soft и Poster при миграции.
Инструмент — для разработки и CI, лёгкий: библиотека `playwright` (только
chromium) + `pixelmatch`/`pngjs`. Тест-раннер для скриншотов не вводится:
Vitest остаётся для unit-тестов, харнесс — один скрипт с двумя режимами.

### 16.1. Что снимаем

Стили: **Soft, Poster** (минимум постановки). На шагах M3/M4 тем же
харнессом добавляются базлайны Minimal и Luxury **до** извлечения их веток.

Состояния (для каждого стиля):

1. `profile-initial` — публичная страница, первый экран (календарный
   маршрут, день не выбран);
2. `calendar-day-selected` — выбран день со слотами (виден список окон);
3. `booking-sheet-open` — шторка записи открыта на шаге услуг;
4. `prices` — страница прайса;
5. `contacts` — страница контактов.

Вьюпорты (2):

- mobile **390×844** (проект Mobile First — основной);
- desktop **1440×900**.

Итого на M0: 2 стиля × 5 состояний × 2 вьюпорта = **20 базлайнов**.
Файлы: `apps/web/tests/visual/baselines/<style>/<state>.<viewport>.png`,
коммитятся в git.

### 16.2. Как снимаем (детерминизм)

- Локальный стек: БД (docker-compose) + api + web. Сид создаёт
  демо-организации с фиксированными slug (по одной на стиль) и
  **фиксированным набором услуг и опубликованных окон**; M0 добавляет
  детерминированный фикстурный сид, не трогая существующий.
- Эмуляция `prefers-reduced-motion: reduce` — анимации всех миров
  схлопываются в мгновенную смену состояния (глобальный закон А5), кадры
  стабильны по построению.
- Перед снимком — ожидание `document.fonts.ready` и networkidle.
- Динамические по времени области (метка «сегодня», ближайшее окно)
  фиксируются: окна сидятся относительно зафиксированной даты, механизм
  фиксации времени (Playwright clock или мок) — часть M0.
- Скрипт: `apps/web/scripts/visual-baselines.mjs`; команды пакета
  `@amolie/web`:
  - `pnpm --filter @amolie/web visual:baseline` — запись/обновление
    базлайнов;
  - `pnpm --filter @amolie/web visual:check` — сравнение текущего рендера
    с базлайнами.
- Зависимости (devDependencies `@amolie/web`, добавляются на M0):
  `playwright` (chromium: `pnpm --filter @amolie/web exec playwright
install chromium`), `pixelmatch`, `pngjs`.

### 16.3. Как сравниваем

- `pixelmatch` по RGBA с учётом антиалиасинга; провал — доля
  diff-пикселей **> 0.1%** площади кадра (стартовое значение, калибруется
  на M0 по фактической стабильности прогонов).
- Diff-кадры пишутся в `apps/web/tests/visual/diffs/` (не коммитятся) и
  прикладываются к отчёту прогона.
- Провал `visual:check` — не блокер навсегда, а сигнал: либо регрессия
  (чиним), либо намеренное изменение (§16.4).

### 16.4. Как утверждаются намеренные расхождения

1. Изменение визуала описано в PR: что и почему меняется.
2. `pnpm --filter @amolie/web visual:baseline` перезаписывает базлайн
   **в том же PR**.
3. Ревьюер видит новые PNG в диффе и утверждает их вместе с кодом;
   намеренное изменение фиксируется записью в CHANGELOG.
