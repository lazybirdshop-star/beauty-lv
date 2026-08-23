---
name: AMOLIE Brand Style Architecture
version: 1.4
description: Архитектура «один движок — шесть визуальных композиций»: soft, poster, luxury, aura, funk, minimal; разделение shared product logic и style-specific visual composition для публичной страницы мастера
status: Реализовано. Каталог закрыт на шести мирах.
---

# AMOLIE — Архитектура фирменных стилей

> **Статус: реализовано.** Движок, контракты, реестр и композиции живут в
> `apps/web/src/features/public-profile/`. Разделы §0, §4–§6, §12 и §13
> сохранены как история миграции M0–M8 и описывают состояние кода **до**
> неё; действующее устройство — §1–§3, §7–§11, §14–§16.

> **Ревизия 1.5 (2026-08-24) — «повторить визит» разбирает движок, а не миры.**
> Кабинет клиента приводит человека на страницу мастера с прошлой корзиной в
> адресе (`?services=id,id`). Разбирает просьбу общее расписание
> (`engine/use-schedule-calendar.ts` + `engine/repeat-booking.ts`): оно решает,
> открывать ли запись сразу, и отдаёт мирам готовый список услуг. Каждый мир
> получил ровно одну строку — передать этот список в свою шторку. Шесть копий
> правила разошлись бы на первой же правке, а сама просьба одинакова, чей бы
> облик ни был вокруг. Услугу, которой больше нет в каталоге, движок молча
> опускает: показывать цену, которую никто не назначал, нельзя.

> **Ревизия 1.4 (август 2026) — шестой мир, MINIMAL.** Мир пришёл готовым
> файлом (`minimal.html`) и залит дословно: палитра автора перенесена
> посимвольно, без подъёма тонов до продуктового порога контраста. Долг,
> который из этого следует, записан числами в `theme-minimal.ts` и
> `theme.test.ts`, а не спрятан. Устройство мира — стандартное: свой
> каталог композиции, свой чанк, свой `DesignPreset`.

> **Ревизия 1.3 (август 2026) — каталог закрыт на пяти мирах.** Пять
> стилей брендовой программы (Soft Studio, Editorial, Minimal, Organic,
> Neo Glass) сняты целиком: композиции, палитры, пары гарнитур, миниатюры,
> базлайны и ключи в данных (миграция `0032`). Остались две классики
> (`soft`, `poster`), Luxury и два авторских мира — AURA и FUNK. Шеринга
> композиций больше нет ни постоянного, ни переходного: ключ стиля и ключ
> композиции совпадают один в один (§8.1, §14.2).

Цель: **ONE PRODUCT · ONE BUSINESS LOGIC · SIX DISTINCT VISUAL WORLDS.**

Документ отвечает на десять вопросов постановки: архитектура (§1–§3),
инвентаризация кода до миграции (§4–§6), интерфейсы (§7), реестр (§8),
выбор композиции в Design Studio (§9), системы движения и формы (§10–§11),
миграция (§12), объём и риски (§13), решения (§14), критерии
приёмки (§15), визуальные базлайны (§16).

Связанные документы: [BRAND_STYLES.md](BRAND_STYLES.md) — чем миры являются;
[DESIGN_STUDIO.md](DESIGN_STUDIO.md) — как мастер до них доходит;
[DESIGN_AUDIT.md](DESIGN_AUDIT.md) — аудит, подтвердивший проблему;
[ARCHITECTURE.md](ARCHITECTURE.md) — общая архитектура монорепозитория.

---

## 0. Доказательная база: что показал аудит кода

_История: состояние `apps/web/src/features/public-profile/` до миграции
M0–M8. Раздел объясняет, почему движок и композиции устроены так, как
описано ниже._

1. **Два параллельных дерева.** `components/` (плакатный мир, ~2 100 строк)
   и `soft/` (мягкий мир, ~2 200 строк). Ветвление маршрутов — строковое:
   `org.designPresetKey !== 'poster' ? <Soft…/> : <Poster…/>` в
   `layout.tsx`, `page.tsx`, `prices/page.tsx`, `contacts/page.tsx`.

2. **Половина каталога — токен-вариации Soft.** Несколько ключей рендерили
   одно и то же дерево `soft/` с разными значениями
   `--panel-radius`/`--card-radius`/`--surface-*`. Композиционно они были
   неотличимы — в монохроме без фотографий это один мир.

3. **Часть ключей — boolean-ветки внутри Soft.** Флаги протянуты через
   `soft/booking-calendar.tsx` (644 строки), `soft/booking-sheet.tsx` (726),
   `soft/booking-steps.tsx` (259), `soft/org-header.tsx` (298),
   `soft/org-nav.tsx` (139). Каждый компонент знал обо всех мирах сразу;
   добавление следующего мира было правкой шести файлов с тернарниками.

4. **Бизнес-логика записи уже продублирована.** Машина состояний записи
   (шаги, маршрут, квитанция, гонки загрузки окон, оптимистичный статус)
   написана дважды: `components/booking-sheet.tsx` (621 строка) и
   `soft/booking-sheet.tsx` (726) — и копии **уже разошлись** в деталях
   (индикатор прогресса плаката всегда показывал четыре сегмента, мягкий
   фильтровал шаг допродаж; это рассинхрон поведения, а не стиля). Это
   главный аргумент за движок: дублирование существовало уже тогда и
   дорожало с каждым миром. Форма гостя была продублирована тем же образом:
   `components/booking-steps.tsx` и `soft/booking-steps.tsx` (§7.6).

5. **Чистая логика уже отделена и стиле-независима** — её нужно было только
   перенести: `types.ts`, `data.ts`, `api.ts`, `booking-cart.ts`,
   `build-calendar.ts`, `group-by-day.ts`, `booking-status.ts`.

6. **Токен-слой работает и проверен.** `ThemeStyle` пишет ~50 переменных
   на `:root` сервером (первый кадр уже в палитре мастера; портал Radix
   наследует). Палитры измерены и закреплены тестом `theme.test.ts`.
   Слой цвета/типографики трогать не нужно — он остаётся фундаментом.

7. **Хореография уже частично токенизирована** (`--ease-style`, `--dur-*`,
   `--anim-sheet-in/out`, `--motion-scale`), но keyframes-реестр был один на
   всех (`sheet-panel-in/out` в `globals.css`), а пер-стилевые анимации
   размазаны по глобальному файлу и жёстко привязаны к классам внутри чужих
   компонентов.

8. **`apps/web` не имел тест-раннера.** Тесты были только в
   `shared-kernel`. Извлечение движка — первое место, где веб-приложению
   понадобились unit-тесты (§12, шаг M0). Визуальных базлайнов не было
   вовсе — перенос двух живых миров проверялся только глазами (§16).

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
только ради того, чтобы все миры использовали одинаковый JSX.** Если
Luxury нужна другая разметка, чем у Soft, — у него другая разметка. Если
AURA нужна другая композиция календаря — она её получает. Если FUNK нужна
другая композиция hero — она у него своя.

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
│   ├── soft/                      #   классика: матовое стекло
│   ├── poster/                    #   классика: латвийская плакатная школа
│   ├── luxury/                    #   грейж-разворот «Bergs» (BRAND_STYLES.md §4)
│   ├── aura/                      #   авторский мир, пришёл файлом `aura.html`
│   └── funk/                      #   авторский мир, пришёл файлом `brutal.html`
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
    ├── booking-status-card.tsx    #   ← страница статуса записи (v1 — общая, §14.3)
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

**Правило роста контракта:** движок растёт только доменным состоянием —
тем, что меняет данные, деньги или доступность. Чисто визуальное состояние
(раскрытая карточка, фаза церемонии, этап анимации) мир держит локально в
своей композиции и в `BookingFlow` не выносит. Полная формулировка и
проверочный вопрос для ревью — §7.7.

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

_История: инвентаризация на момент аудита. «Веток, образующих композицию»,
у ключей коллекции не существовало — только тернарники внутри
soft-компонентов и один ранний возврат в `soft/org-header.tsx:54`. Поэтому
с нуля строился каждый мир, кроме soft и poster, которые переносились как
есть._

**Действующее состояние.** Каждый из шести миров каталога держит полный
набор слотов контракта `BrandStyleComposition` (§7.1) в собственном
каталоге и собственном чанке.

| Слот композиции                  | Назначение                                    | Soft                  | Poster                            | Luxury                     | AURA                | FUNK                             |
| -------------------------------- | --------------------------------------------- | --------------------- | --------------------------------- | -------------------------- | ------------------- | -------------------------------- |
| `Shell`                          | Каркас страницы: расположение hero/панели/нав | панель-мир            | сплит-экран                       | журнальный разворот        | слоистая сцена орба | блочная сетка необрутализма      |
| `Header`                         | Hero: имя, фото, действия, медиа-обработка    | `soft/org-header.tsx` | `poster/org-header.tsx`           | своя (вертикальное имя)    | своя (орб)          | своя (чернильный блок)           |
| `Nav`                            | Навигация разделов                            | pill-track            | правило                           | таб-негатив                | своя                | своя                             |
| `CalendarSection`                | Факты + сетка дат + слоты + CTA               | своя                  | своя                              | своя                       | своя                | своя                             |
| `DayCell`                        | Ячейка дня (геометрия/метки мира)             | внутри секции         | внутри секции                     | внутри секции              | внутри секции       | внутри секции                    |
| `ServiceListSection`             | Прайс: группы, карточки, детальный лист       | своя                  | своя + `service-detail-sheet.tsx` | нумерованный прайс         | своя                | своя                             |
| `BookingSheet`                   | Хром и сцены записи поверх `BookingFlow`      | своя                  | своя                              | шторка-лист со степ-чипами | своя                | своя                             |
| `ContactsSection`                | Контакты                                      | своя                  | своя                              | своя                       | своя                | своя                             |
| `SheetChrome`                    | Панель шторки: ручка/шов/край/закрытие        | из `ui/sheet.tsx`     | из `ui/sheet.tsx`                 | брусок 40×3                | своя                | своя (без ручки, шов несёт край) |
| `MotionSpec`                     | Хореография мира (§10)                        | базовый набор         | базовый набор                     | своя                       | своя (`motion.css`) | своя (`motion.css`)              |
| `EmptyState`/`Loading`/`Success` | Состояния внутри секций и шторки              | свои                  | свои                              | свои (церемония)           | свои                | свои                             |

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
3. **`shared/contacts-step.tsx`** — единая сцена контактов записи для всех
   миров: поля имени, телефона и Instagram, маска телефона, валидация,
   состояния ошибки, `role="alert"`, состояние отправки, поведение и aria
   полей. Мир задаёт **вид** полей и кнопок сцены — классами и слотами
   (§7.6), как уже сделано в `booking-followup`, — но не переписывает саму
   сцену. Обоснование: семь копий маски телефона — это семь мест
   расхождения поведения, а узнаваемости поле ввода миру не даёт. Семи
   копий формы не существует никогда.
4. **`shared/booking-followup.tsx`** — «добавить в календарь»: уже принимает
   классы кнопок от вызывающего мира. Остаётся.
5. **`shared/booking-status-card.tsx`** — страница статуса записи
   (`/booking/[token]`): утилитарный экран «факт и действия», не витрина.
   v1 — общий, читающий токены. Решение зафиксировано в §14.3.
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
  /** Хореография мира — данные, не компонент (§10); в основном бандле (§8.2). */
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
  /** Ручка: рисуется миром; null — шов несёт кромку (FUNK). */
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

Свобода разметки не должна означать семь диалектов доступности. В
`engine/a11y.ts` — построители подписей (`dayAriaLabel(cell, t)`,
`slotAriaLabel(slot, t)`), конвенции ролей и чек-лист композиции
(фокус-кольца, 44px, `aria-pressed`, `role="alert"` на ошибках). Чек-лист
проверяется на ревью каждого мира; подписи — общие функцией, поэтому
словесная часть доступности не расходится между мирами.

### 7.6. Шаг «Контакты» — общий навсегда

Форма гостя — это домен: одни поля, одни правила, одна доступность, одна
отправка. **Семь независимых копий формы не создаётся ни в каком мире.**
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
export const BRAND_STYLE_KEYS = ['soft', 'poster', 'luxury', 'aura', 'funk'] as const;
// пять ключей → пять композиций: мир, дерево и чанк совпадают (§14.2)

export type BrandStyleKey = (typeof BRAND_STYLE_KEYS)[number];

/** designPresetKey (БД) → композиция. */
export function resolveBrandStyleKey(designPresetKey: string | null): BrandStyleKey {
  switch (designPresetKey) {
    case 'poster':
      return 'poster';
    case 'luxury':
      return 'luxury';
    case 'aura':
      return 'aura'; // мир пришёл готовым файлом от автора — своя композиция
    case 'funk':
      return 'funk'; // то же самое
    case 'soft':
    default:
      return 'soft'; // неизвестный и снятый ключ → дефолт продукта
  }
}
```

Шеринга композиций не осталось: ключ стиля и ключ композиции совпадают один
в один. Неизвестный ключ падает в `soft`, а не в ошибку — существующие
страницы мастеров не ломаются никогда, и через ту же ветку проходят ключи
снятых миров, если они где-то уцелели в данных.

**AURA и FUNK — не члены брендовой программы.** Оба мира пришли в продукт
отдельным путём — готовыми файлами от авторов (`aura.html`,
`brutal.html`), — и свои композиции им нужны не по праву членства, а по
факту: их структура (аврора под всем листом и орб шапки у одного; бегущая
строка, блоки с жёсткой тенью и блюпринт-сетка у другого) не выражается ни
одним из классических деревьев. Критерий §15.3 при этом соблюдён
буквально: добавление мира это новый каталог в `compositions/` плюс строка
в реестре, и ни один файл действующих миров не правился.

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
  luxury: dynamic(() => import('../compositions/luxury/root')),
  aura: dynamic(() => import('../compositions/aura/root')),
  funk: dynamic(() => import('../compositions/funk/root')),
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
  один мир + общий engine; миры не раздувают бандл друг друга
  (бюджет чанка в CI — R3).
- **SSR-первый кадр сохраняется.** `next/dynamic` с SSR (по умолчанию)
  рендерит root на сервере, CSS мира приезжает с его чанком в SSR-выдаче —
  занавес Luxury и прочие first-frame-церемонии работают (проверяется на
  M-шаге мира и скриншот-харнессом §16).
- **Motion всех миров — в основном бандле сразу, и это явно.**
  `MotionSpec` — данные, а `dynamic()` данные не загружает: спецификации
  собираются статическими импортами в `registry/motions.ts` и
  попадают в основной бандл при любом раскладе. Это осознанная плата
  (единицы килобайт констант) за синхронный доступ к хореографии на первом
  кадре и в общих хелперах (`SheetBase`, reduced-motion); объект композиции
  мира ссылается на тот же экземпляр, поэтому в чанк мира уезжают только
  его компоненты и CSS. Ленивой загрузки motion нет и не будет —
  фиксируется здесь, чтобы не обнаружилось на ревью.
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

_История: на время миграции реестр допускал алиас на уровне загрузчика —
мир работал на чужой композиции, пока его собственная не приземлилась.
Благодаря этому миграция была очередью независимых шагов, а не big bang
(§12)._

**Алиас — только временное состояние миграции, не конечное.** У каждого
алиаса стоял шаг, который его снимает, и очередь закрыта. Постоянного
шеринга композиций в каталоге тоже не осталось: миры, делившие дерево soft,
сняты целиком (ревизия 1.3), и сегодня ключ стиля равен ключу композиции.
Очередь burn-down в TASKS.md пуста.

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

Матрица хореографии (спецификации — BRAND_STYLES.md §5 и постановка):

| Мир    | Характер                      | Sheet                          | Переходы шагов/месяца | Press           | Page entrance   |
| ------ | ----------------------------- | ------------------------------ | --------------------- | --------------- | --------------- |
| Soft   | gentle spring / soft reveal   | spring up, 24px + лёгкий scale | мягкий reveal 600ms   | scale 0.97      | плавный подъём  |
| Poster | poster wipe / decisive        | жёсткий wipe снизу, без scale  | wipe/срез, 200ms      | мгновенный/цвет | срез поля       |
| Luxury | cinematic / slow / deliberate | 520/280ms, тихий dim 35%       | fade 500ms            | brightness 0.92 | занавес 640ms   |
| AURA   | pearl / breathing             | подъём листа, дыхание орба     | мягкое перетекание    | мягкий отклик   | проявление ауры |
| FUNK   | brutal / snap                 | резкий блок, без scale         | мгновенная смена      | сдвиг блока     | блоки встают    |

Правила:

- **Reduced-motion остаётся глобальным законом**: единый
  `@media (prefers-reduced-motion: reduce)` гасит все `anim-*` миров (как
  сейчас), springs в `motion/react` — через `useReducedMotion` в общих
  хелперах. Мир не может отменить закон, потому что не владеет им.
- **Токены темпа сохраняются** (`--ease-style`, `--dur-*`, `--motion-scale`):
  это ручка интенсивности Студии и SSR-первый кадр; keyframes мира читают
  `var()` внутри — механика уже доказана на `sheet-panel-in`.
- Анимации мира живут в его `compositions/<мир>/motion.css` и едут с его
  чанком. `globals.css` держит только продуктовые (не мировые) анимации.

## 11. Система формы: геометрия живёт в разметке мира

Токены радиусов остаются эмитироваться (`--panel-radius` и кин — их читают
soft-мир и overrides), но мир больше не обязан строить геометрию из них.

Единственный носитель формы — JSX/CSS композиции мира. Декларативного
описания геометрии в архитектуре нет: описание, которое ничто не сверяет
с разметкой, разошлось бы с ней молча — спека говорит «круг», компонент
рендерит арку. Второго источника правды о форме не существует. `MotionSpec`
при этом остаётся (§10) — у него есть реальные потребители: `SheetBase`
читает классы входа/выхода, хелперы motion/react читают springs, хосты —
тип перехода шага.

Места, которым «нужно знать силуэт», решаются живым рендером, а не
описанием: превью Студии рендерит настоящий компонент мира через реестр
(§9; живые миниатюры — M8), статус-страница читает токены (§14.3).

Реальная геометрия живёт в разметке мира: Poster — прямоугольные поля и
линейки; Luxury — печатный разворот с чернильными швами и ни одним
скруглением; AURA — орб, перламутровое стекло и мягкие листы; FUNK — блоки
с жёстким контуром и тенью-сдвигом; Soft — крупные радиусы и пилюли.
`clip-path`/маски мира (напр. cut-out портрет Soft) — внутри его
компонентов.

---

## 12. План миграции

Каждый шаг — отдельный коммит/деплой с полным циклом проверок
(`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, визуальный
прогон обоих живых миров — до переносов компонентов он выполняется
скриншот-харнессом на Playwright (§16), а не глазами). Откат любого шага
не трогает остальные.

**M0. Тестовая и визуальная опора.**
а) Поднять Vitest в `apps/web` (конфиг уровня shared-kernel).
Характеризационные тесты на существующие чистые функции (`booking-cart`,
`build-calendar`, `group-by-day`) — до их переноса.
б) Скриншот-харнесс на Playwright (§16) — вводится в проект на этом же
шаге, наравне с Vitest: devDependencies `playwright` + `pixelmatch` +
`pngjs`, команды `visual:baseline` / `visual:check`, детерминированные
снимки Soft и Poster **до любого переноса компонентов**, детектор
регрессий для M2–M4. §12 и §15 многократно опираются на «проверку
скриншотами» — без инструмента в проекте этот критерий приёмки ничем не
обеспечен, поэтому харнесс не откладывается.
_Выход: зелёный `pnpm test` в web; работающие `visual:baseline` /
`visual:check`; 20 базлайнов двух живых миров в git; рисков нет._

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
`service-picker.tsx`. Тернарники строящихся миров переезжают вместе с
soft-деревом и живут до своих шагов; реестр держит временные алиасы на
soft root (§8.3).
_Выход: архитектура стоит; рендер идентичен текущему — контроль
скриншот-харнессом (soft/poster страницы до пикселя)._

**M3–M7. Миры коллекции.** Каждый мир строился с нуля по своей секции
BRAND_STYLES.md и своим референсам: композиция (header/nav/calendar/sheet/
хром) плюс собственный `motion.css`, анимации переезжают из `globals.css`,
soft-дерево очищается от его тернарников, рендер соседей контролируется
базлайнами. Приземлился и остался в каталоге один Luxury (M4) — грейж-
разворот «Bergs»; остальные шаги закрыты, а их миры сняты ревизией 1.3.

**M8. Design Studio.** Живые миниатюры миров через реестр, группировка
каталога по мирам; чистка слоя токенов от «замороженных» значений, которые
больше не несут нагрузки; финальный проход документации.

Параллелизуемость: M3–M7 независимы между собой после M2.

---

## 13. Объём и риски

### 13.1. Объём (оценка по измеренному коду)

| Шаг   | Содержание                                                                             | Оценка       |
| ----- | -------------------------------------------------------------------------------------- | ------------ |
| M0    | Vitest в web + характеризация pure-функций + Playwright-харнесс и фикстурный сид       | 1 д          |
| M1    | Два хука движка + слияние копий + тесты + P1-5                                         | 2–3 д        |
| M2    | Контракты, реестр, SheetBase, ContactsStep, перенос двух деревьев, хосты, lint-границы | 2–3 д        |
| M3–M7 | Миры коллекции: каждый с нуля (композиция + motion.css + очистка soft-дерева)          | 5–7 д каждый |
| M8    | Студия, чистка, документация                                                           | 1–2 д        |

Итого: **≈ 31–44 рабочих дня** при последовательном прохождении;
M3–M7 распараллеливаются. Прежняя оценка (16–23 дня) была занижена
примерно вдвое: она считала часть миров наполовину готовыми («извлечение
веток»), но веток не существовало (§5) — каждый мир строился с нуля.

По строкам: engine ~900 (из них ~600 — новая сборка существующей логики),
contracts ~250, registry+hosts ~200, SheetBase ~120, ContactsStep ~200
(слияние двух существующих копий), харнесс ~150 (один скрипт с режимами
capture/check). Композиции: soft и poster — перенос ~4 300 существующих
строк; каждый новый мир — ~1 500–2 000 новых строк; стартового кода почти
не было: один ранний возврат в `soft/org-header.tsx:54` и несколько
keyframes в `globals.css`.

### 13.2. Реестр рисков

| #   | Риск                                                           | Вер. | Ущерб | Митигация                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Регрессия записи при слиянии машин (M1) — денежный путь        | С    | Выс.  | Слияние до визуальных троганий; характеризационные тесты до переноса; расхождения копий — явные решения §14.1; ручной e2e обоих миров; деплой M1 отдельным релизом                                                             |
| R2  | Дрейф a11y между мирами (пять разметок одного сценария)        | С    | Сред. | `engine/a11y.ts` общие подписи; `SheetBase` удерживает диалоговое поведение; `ContactsStep` удерживает форму; чек-лист контрактов на ревью каждого мира                                                                        |
| R3  | Рост бандла мирами каталога                                    | Н    | Сред. | Один dynamic boundary на мир (§8.2) — грузится один чанк мира + engine; motion всех миров — данные в основном бандле (единицы КБ, §8.2); бюджет чанка в CI (size-limit)                                                        |
| R4  | Первый кадр: CSS мира из async-чанка опаздывает (FOUC/занавес) | Н    | Сред. | dynamic+SSR включает CSS чанка в выдачу; проверка первого кадра каждого мира на его M-шаге; критические keyframes первого кадра можно поднять в `globals.css` точечно                                                          |
| R5  | Миниатюры Студии расходятся с реальными страницами             | С    | Низ.  | Миниатюра = тот же реестр (M8); до M8 — честные статичные силуэты без обещания точности                                                                                                                                        |
| R6  | Полумиграция: миры живут на алиасах дольше плана               | С    | Низ.  | Алиас — только временное состояние миграции: у каждого стоит шаг, который его снимает (M3–M7); конечное состояние — собственная композиция у каждого мира; burn-down в TASKS.md; алиас, переживший свой M-шаг, — дефект релиза |
| R7  | Классические ключи (`soft`, `poster`, старые темы) сломаны     | Н    | Выс.  | Резолвер §8.1 покрывает все ключи каталога и снятых миров; fallback → soft; тест на `resolveBrandStyleKey`                                                                                                                     |
| R8  | Overrides мастера перестают доезжать до какого-то мира         | Н    | Сред. | Запрет хардкода цвета в композициях (lint + ревью); визуальный прогон с overrides на M-шаге мира                                                                                                                               |
| R9  | Регрессия плакатного мира — главного актива (аудит §7)         | Н    | Выс.  | M2 — чистый перенос без правок разметки; скриншот-харнесс §16: базлайны сняты на M0 до переноса, `visual:check` на каждом M-шаге                                                                                               |
| R10 | Флаки скриншот-сравнений (шрифты, антиалиасинг, анимации)      | С    | Низ.  | Эмуляция reduced-motion, ожидание `document.fonts.ready`/networkidle, порог 0.1%, маскирование динамики; калибровка порога на M0; diff-кадры как артефакт                                                                      |

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
- Не создаём семь копий шага «Контакты» — одна реализация, мир управляет
  подачей (§7.6).
- Не делаем per-slot `dynamic()` и не загружаем данные (motion) как
  компоненты — одна каноническая модель реестра; motion всех семи миров —
  статические данные в основном бандле (§8.2).
- Не добавляем визуальные состояния миров в движок записи (§7.7).
- Не вводим тяжёлый screenshot-фреймворк: библиотека playwright +
  pixelmatch закрывают задачу базлайнов (§16); Vitest остаётся для
  unit-тестов.
- Не создаём абстракции, чтобы принудить все миры к общему JSX (§1.1).

---

## 14. Решения (утверждённые и открытые)

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

**Статус: утверждено, окончательно.**

Каталог — **шесть миров**: две классики (`soft`, `poster`), `luxury` и три
авторских мира — `aura`, `funk` и `minimal`. Столько же и композиций (§8.1):
ключ стиля равен ключу композиции, шеринга не осталось ни постоянного, ни
переходного.

Имя `minimal` когда-то принадлежало снятому пресету брендовой программы и
освободилось ревизией 1.3 (миграция `0032`). Совпадение имён здесь
безопасно ровно потому, что старый ключ удалён из данных: неизвестный ключ
падает в `soft` (§14.2, R7), а не в чужой мир.

Пять ключей брендовой программы (`soft-studio`, `editorial`, `minimal`,
`organic`, `neo-glass`) сняты ревизией 1.3 — из кода, из данных и из
базлайнов. Токенные классики (`blush-rose` и др.) продолжают работать —
они палитры, не композиции.

### 14.3. Страница статуса записи

`/booking/[token]` — утилитарный экран. Предлагается v1: общий компонент на
токенах мира (как сейчас). Стилевые церемонии статуса — отдельным
улучшением после M8, если потребуется.

### 14.4. Порядок новых миров

Порядок шагов M3–M7 был свободен: миры независимы друг от друга после M2
(§12). Правило остаётся в силе для любого будущего мира.

---

## 15. Критерии приёмки архитектуры

1. Один `use-booking-flow` обслуживает все миры; строк «дублированной
   машины» в кодовой базе нет (поиск по `fetchAvailability` даёт одно
   место — engine). Шаг «Контакты» существует в одной реализации —
   `shared/contacts-step.tsx`.
2. Маршруты и layout не содержат строковых ветвлений по `designPresetKey` —
   только `resolveBrandStyleKey` + `CompositionRoot` и хосты. Реестр —
   одна каноническая модель §8.2: один dynamic boundary на мир, motion —
   данные в основном бандле (§8.2).
3. Добавление нового мира = новый каталог в `compositions/` + строка в
   реестре. Существующие файлы миров не правятся.
4. **Монохром-тест:** скриншоты всех **композиций** в grayscale без
   изображений различимы по композиции; проверка — тем же харнессом §16 на
   шаге каждого мира.
5. **Референс-тест:** каждый мир, построенный с нуля, соответствует своим
   референсам
   `docs/references/<key>/`: на M-шаге мира скриншоты ключевых состояний
   (харнесс §16) прикладываются к референсам и утверждаются ревьюером.
   Различимость в монохроме и попадание в референс — два разных
   требования; одно другим не покрывается.
6. **Soft и Poster не меняются ни на пиксель** на всём протяжении
   программы: `visual:check` по базлайнам M0 зелёный на каждом шаге
   M1–M8; намеренных изменений рендера живых миров программа не содержит
   (§16.4 к soft/poster до конца программы не применяется).
7. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` зелёные на
   каждом шаге; бандл главного маршрута растёт не более чем на размер
   одного чанка мира (плюс малые данные motion всех миров в основном
   бандле, §8.2).
8. Правило роста контрактов (§7.7) подтверждено ревью каждого шага: в
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

Стили: **Soft, Poster** (минимум постановки) и Luxury. Базлайны мира,
который ещё строится, не снимаются: он заведомо отличается от рендера, на
котором пока живёт, — его приёмка идёт по референсам `docs/references/<key>/`
и монохром-тесту (§15), а не по базлайнам.

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
