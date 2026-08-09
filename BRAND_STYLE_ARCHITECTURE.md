---
name: AMOLIE Brand Style Architecture
version: 1.0-draft
description: Архитектура «один движок — шесть визуальных миров»: разделение shared product logic и style-specific visual composition для публичной страницы мастера. Спецификация до реализации; код не меняется
status: Ожидает утверждения. Не реализовано.
---

# AMOLIE — Архитектура фирменных стилей

> **Статус: проект. Код приложения этот документ не меняет.** Реализация
> начинается после утверждения, шагами §12 — каждый шаг независимо
> поставляем и не ломает работающее.

Цель: **ONE PRODUCT · ONE BUSINESS LOGIC · SIX DISTINCT VISUAL WORLDS.**

Документ отвечает на десять вопросов постановки: архитектура (§1–§3),
инвентаризация существующего кода (§4–§6), интерфейсы (§7), реестр (§8),
выбор композиции в Design Studio (§9), системы движения и формы (§10–§11),
миграция (§12), объём и риски (§13), открытые решения (§14).

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
   дорожает с каждым миром.

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
   нужны unit-тесты (см. §12, шаг M0).

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

**Шестое измерение стиля.** BRAND_STYLES.md §2 определяет стиль пятью
измерениями: палитра, типографика, поверхности, движение, форма. Эта
архитектура добавляет шестое — **композицию** — и перераспределяет nosителей:

| Измерение   | Носитель после рефакторинга                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Палитра     | Токены (`ThemeStyle`), как сейчас. Всегда токены — overrides мастера и гарантии контраста живут здесь                 |
| Типографика | Токены шрифтовых слотов + display-поведение; композиция вольна задавать кегли/насыщенность своей разметкой            |
| Поверхности | Токены значений (`--panel-radius` и кин) **и/или** собственная геометрия композиции — мир может не читать токен вовсе |
| Движение    | **Per-style хореография** (§10): свои keyframes, свои springs, свои жесты                                             |
| Форма       | **Per-style геометрия** (§11): реальная разметка, не только радиусы                                                   |
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
│   └── chrome.ts                  #   SheetChrome, MotionSpec (§10), ShapeSpec (§11)
│
├── compositions/                  # STYLE-SPECIFIC. Один каталог = один мир.
│   ├── soft/                      #   ← нынешнее soft/ минус ветки minimal/luxury
│   ├── poster/                    #   ← нынешнее components/
│   ├── minimal/                   #   ← извлечение веток из soft-дерева
│   ├── luxury/                    #   ← извлечение веток из soft-дерева
│   ├── neo-glass/                 #   НОВЫЙ мир (пространственная композиция)
│   ├── organic/                   #   НОВЫЙ мир (асимметрия, тактильность)
│   └── editorial/                 #   Решение §14.3 — свой мир или алиас poster
│
├── registry/
│   ├── brand-style.ts             #   BrandStyleKey, алиасы, fallback (§8)
│   └── brand-style-registry.ts    #   lazy-загрузчики композиций (§8)
│
└── shared/                        # Визуально общее — сознательно короткий список (§6)
    ├── theme-style.tsx            #   ← перенос из components/ без изменений
    ├── sheet-base.tsx             #   НОВОЕ: headless-поведение шторки (Radix) без хрома (§7.4)
    ├── booking-followup.tsx       #   ← .ics/Google Calendar; стиль передаёт классы кнопок
    ├── booking-status-card.tsx    #   ← страница статуса записи (v1 — общая, §14.4)
    └── ambient-backdrop.tsx       #   ← световой фон для стеклянных миров
```

Маршруты `app/[slug]/(public)/*` перестают импортировать `soft/*` и
`components/*` напрямую — только registry и engine.

Каталог `soft/service-picker.tsx` (0 строк, мёртвый файл) удаляется на шаге M2.

---

## 3. Что остаётся shared — гарантии постановки

Ничто из этого списка не дублируется между мирами **никогда**:

| Область                 | Где живёт                                                               | Сегодня                                                 |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Запись (state machine)  | `engine/use-booking-flow.ts`                                            | ⚠️ дублируется в двух деревьях — главная находка аудита |
| Календарная математика  | `engine/build-calendar.ts`                                              | ✅ уже общая                                            |
| Доступность (fetch)     | `engine/api.ts` + `engine/data.ts`                                      | ✅ уже общая                                            |
| Состояние календаря     | `engine/use-schedule-calendar.ts`                                       | ⚠️ дублируется в двух календарях                        |
| Корзина/допродажи       | `engine/booking-cart.ts`                                                | ✅ уже общая                                            |
| Типы домена             | `engine/types.ts`                                                       | ✅ уже общие                                            |
| Локализация             | `lib/i18n` (I18nProvider/useT/useLocale/fmt)                            | ✅ общая; + фикс P1-5 (шапка недели из `Intl`) в engine |
| Палитра/статусы/шрифты  | `shared/theme-style.tsx` + shared-kernel                                | ✅ общая, не трогаем                                    |
| Поведение диалога       | `shared/sheet-base.tsx` (Radix: фокус-ловушка, ESC, скролл-лок, портал) | ⚠️ сейчас сшито с хромом в `ui/sheet.tsx`               |
| Фоллоу-ап записи        | `shared/booking-followup.tsx`                                           | ✅ уже общий (получает классы от мира)                  |
| Маршрутизация, auth, БД | вне фичи                                                                | ✅ вне scope                                            |

Контрактный запрет, который держит архитектуру: **композиция не вызывает
`api.ts`/`data.ts` напрямую и не содержит `fetch`** — данные и действия
приходят пропсами. Линтер-правило (custom ESLint `no-restricted-imports` для
`compositions/**`) закрепляет запрет на шаге M2.

---

## 4. Инвентаризация: существующий код → движок

Перенос без изменения поведения; визуальные файлы в список не входят.

| Файл (сегодня)                                                                                                    | Куда                              | Изменения при переносе                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                                                                                                        | `engine/types.ts`                 | нет                                                                                                                                      |
| `data.ts`                                                                                                         | `engine/data.ts`                  | нет                                                                                                                                      |
| `api.ts`                                                                                                          | `engine/api.ts`                   | нет                                                                                                                                      |
| `booking-cart.ts`                                                                                                 | `engine/booking-cart.ts`          | нет                                                                                                                                      |
| `build-calendar.ts`                                                                                               | `engine/build-calendar.ts`        | + локализуемая шапка недели через `Intl.DateTimeFormat(locale, { weekday: 'short' })` вместо `WEEKDAY_HEADERS_RU` (закрывает аудит P1-5) |
| `group-by-day.ts`                                                                                                 | `engine/group-by-day.ts`          | нет                                                                                                                                      |
| `booking-status.ts`                                                                                               | `engine/booking-status.ts`        | нет                                                                                                                                      |
| state-машина `soft/booking-sheet.tsx` + `components/booking-sheet.tsx`                                            | `engine/use-booking-flow.ts`      | **слияние двух копий в одну**; расхождения поведения — решения §14.1                                                                     |
| state `soft/booking-calendar.tsx` + `components/booking-calendar.tsx` (месяц, выбор даты/слота, overrides, facts) | `engine/use-schedule-calendar.ts` | слияние; facts-проекция (услуги/окна/ближайшее) общая                                                                                    |
| aria-подписи слотов/дней, размазанные по двум календарям                                                          | `engine/a11y.ts`                  | единые построители `slotAriaLabel()`, `dayAriaLabel()` — словесная согласованность миров бесплатно                                       |

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
3. **`shared/booking-followup.tsx`** — «добавить в календарь»: уже принимает
   классы кнопок от вызывающего мира. Остаётся.
4. **`shared/booking-status-card.tsx`** — страница статуса записи
   (`/booking/[token]`): утилитарный экран «факт и действия», не витрина.
   v1 — общий, читающий токены. Решение зафиксировано в §14.4.
5. **`shared/ambient-backdrop.tsx`** — свет для стекла; миры без blur его
   не запрашивают (как сейчас).
6. **Базовые контролы кабинета (`components/ui/*`)** — вне территории
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
  /** Хореография и геометрия — данные, не компоненты (§10–§11). */
  motion: MotionSpec;
  shape: ShapeSpec;
}
```

Частичные композиции запрещены: мир реализует все слоты, иначе тип не
сходится — реестр не даст собрать «полмира». (Во время миграции недостающие
слоты мира временно заполняются ссылками на soft-слоты — это механизм
алиасов §8, а не частичность.)

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

Сцены шагов мира (`ServicesStep`, `AddonsStep`, `TimeStep`, `ContactsStep`,
успех) — внутренние компоненты его `BookingSheet`, не слоты реестра: мир
владеет своей шторкой целиком. Общие куски шагов (строка услуги с тиком,
чип времени) мир реализует сам — это и есть его геометрия.

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

### 8.2. Реестр с ленивой загрузкой

```ts
// registry/brand-style-registry.ts  (client module)
import dynamic from 'next/dynamic';

const REGISTRY = {
  soft: {
    Shell: dynamic(() => import('../compositions/soft/shell')),
    Calendar: dynamic(() => import('../compositions/soft/calendar-section')),
    /* … */
  },
  poster: {/* … */},
  /* minimal, luxury, organic, neo-glass … */
} as const;
```

- Один мир на страницу → **загружается один чанк композиции** плюс общий
  engine. Шесть миров не раздувают бандл друг друга.
- `next/dynamic` с SSR по умолчанию: первый кадр серверный, CSS мира
  приезжает с его чанком — первый-кадр-анимации (занавес Luxury) работают,
  потому что стили мира включены в SSR-выдачу (проверяется на M-шаге мира).
- Маршруты рендерят тонкий клиентский хост:

```tsx
// server: app/[slug]/(public)/page.tsx
const org = await getOrganizationBySlug(slug); // cache: без лишних запросов
const slots = await getPublishedSlots(slug);
return (
  <CalendarHost
    styleKey={resolveBrandStyleKey(org.designPresetKey)}
    org={org}
    initialSlots={slots}
  />
);
```

```tsx
// client: registry/calendar-host.tsx
export function CalendarHost({ styleKey, org, initialSlots }: Props) {
  const Composition = REGISTRY[styleKey].Calendar;
  const calendar = useScheduleCalendar({ org, initialSlots });
  return <Composition data={calendar.data} state={calendar.state} actions={calendar.actions} />;
}
```

Хост — единственная точка, где engine встречает композицию. Пропсы через
границу server→client сериализуемы (org/slots — plain data, как сегодня).

Layout аналогично: `ShellHost` вместо нынешнего тернарника
`isPanelWorld ? … : …`. Подробности `generateViewport` и `ThemeStyle` не
меняются.

### 8.3. Алиасы как механизм миграции

Реестр допускает `minimal: REGISTRY.soft` на переходный период: мир
продолжает работать на soft-композиции, пока его собственная не приземлилась.
Благодаря этому миграция — очередь независимых шагов, а не big bang (§12).

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
   через тот же `CompositionHost` с реальными данными мастера — drift
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

## 11. Система формы: per-style геометрия

Токены радиусов остаются эмитироваться (`--panel-radius` и кин — их читают
soft-мир и overrides), но мир больше не обязан строить геометрию из них.
`ShapeSpec` — декларативное резюме геометрии мира для тех мест, где общий
код должен знать силуэт (превью Студии, статус-страница):

```ts
// contracts/chrome.ts
export interface ShapeSpec {
  /** Силуэт аватара/медиа: 'circle' | 'squircle' | 'rect' | 'pebble' | 'arch'. */
  avatar: 'circle' | 'squircle' | 'rect' | 'pebble' | 'arch';
  /** Несущая кромка мира: 'shadow' | 'rule' | 'glow' | 'seam'. */
  edge: 'shadow' | 'rule' | 'glow' | 'seam';
  /** Корпус действия: 'pill' | 'rect' | 'soft-rect'. */
  control: 'pill' | 'rect' | 'soft-rect';
}
```

Реальная геометрия живёт в разметке мира: Poster — прямоугольные поля и
линейки; Minimal — инженерное семейство 8–16px и волосяные линейки; Neo
Glass — парящие слои и squircle; Organic — асимметрия, неровные пропорции,
возможные `border-radius` с разными углами и маски; Luxury — архитектурные
прямоугольники с церемониальными швами. `clip-path`/маски мира (напр.
cut-out портрет Soft, маска растворения) — внутри его компонентов.

---

## 12. План миграции

Каждый шаг — отдельный коммит/деплой с полным циклом проверок
(`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, визуальный
прогон обоих живых миров). Откат любого шага не трогает остальные.

**M0. Тестовая опора движка.** Поднять Vitest в `apps/web` (конфиг уровня
shared-kernel). Характеризационные тесты на существующие чистые функции
(`booking-cart`, `build-calendar`, `group-by-day`) — до их переноса.
_Выход: зелёный `pnpm test` в web; рисков нет._

**M1. Engine extraction.** Перенос §4 в `engine/`; создание
`use-schedule-calendar` и `use-booking-flow`; обе существующие пары
календарь+шторка (soft и poster) переводятся на хуки; дублированные тела
удаляются. Расхождения копий разрешаются по §14.1. Плюс фикс P1-5 в
`engine/build-calendar.ts`. **Визуально — ноль изменений.**
_Выход: две машины состояний → одна; тесты хуков (маршрут шагов, гонка
`cancelled`, receipt, reset); ручной прогон записи в обоих мирах._
_Это самый рискованный шаг — деньги проходят через него; см. §13._

**M2. Contracts + Registry.** `contracts/*`, `registry/*`, `SheetBase`;
`soft/` → `compositions/soft/`, `components/` → `compositions/poster/`
(механический перенос, импорты через алиасы). Маршруты и layout переходят
на `resolveBrandStyleKey` + хосты; строковые тернарники `!== 'poster'`
исчезают. ESLint `no-restricted-imports`: compositions не импортируют
`engine/api|data` и друг друга. Удаляется мёртвый `service-picker.tsx`.
_Выход: архитектура стоит; рендер идентичен текущему попиксельно
(проверка скриншотами soft/poster/minimal/luxury страниц)._

**M3. Minimal composition.** Ветки `minimal` выносятся из soft-дерева в
`compositions/minimal/` (header/nav/calendar/sheet/хром + `motion.css`).
Soft-дерево очищается от тернарников minimal. _Выход: два чистых мира
вместо одного ветвистого; рендер minimal идентичен._

**M4. Luxury composition.** Аналогично: `anim-luxury-*` уезжают в
`compositions/luxury/motion.css`, занавес — в luxury `Shell`.
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

| Шаг | Содержание                                                               | Оценка  |
| --- | ------------------------------------------------------------------------ | ------- |
| M0  | Vitest в web + характеризация pure-функций                               | 0.5 д   |
| M1  | Два хука движка + слияние копий + тесты + P1-5                           | 2–3 д   |
| M2  | Контракты, реестр, SheetBase, перенос двух деревьев, хосты, lint-границы | 2–3 д   |
| M3  | Minimal: извлечение веток + motion.css                                   | 1–1.5 д |
| M4  | Luxury: извлечение веток + церемонии                                     | 1–1.5 д |
| M5  | Neo Glass: новый мир (композиция + motion + shape)                       | 3–4 д   |
| M6  | Organic: новый мир                                                       | 3–4 д   |
| M7  | Editorial (по решению)                                                   | 0.5–3 д |
| M8  | Студия, чистка, документация                                             | 1–2 д   |

Итого: **≈ 15–22 рабочих дня** при последовательном прохождении;
M3+M4 и M5–M7 распараллеливаются.

По строкам: engine ~900 (из них ~600 — новая сборка существующей логики),
contracts ~250, registry+hosts ~150, SheetBase ~120. Композиции: soft и
poster — перенос ~4 300 существующих строк; minimal/luxury — извлечение
~1 200 строк веток; neo-glass/organic — ~1 500–2 000 новых строк каждый.

### 13.2. Реестр рисков

| #   | Риск                                                           | Вер. | Ущерб | Митигация                                                                                                                                                             |
| --- | -------------------------------------------------------------- | ---- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Регрессия записи при слиянии машин (M1) — денежный путь        | С    | Выс.  | Слияние до визуальных троганий; характеризационные тесты до переноса; расхождения копий — явные решения §14.1; ручной e2e обоих миров; деплой M1 отдельным релизом    |
| R2  | Дрейф a11y между мирами (шесть разметок одного сценария)       | С    | Сред. | `engine/a11y.ts` общие подписи; `SheetBase` удерживает диалоговое поведение; чек-лист контрактов на ревью каждого мира                                                |
| R3  | Рост бандла шестью мирами                                      | Н    | Сред. | `next/dynamic` на композицию — грузится один мир + engine; бюджет чанка в CI (size-limit)                                                                             |
| R4  | Первый кадр: CSS мира из async-чанка опаздывает (FOUC/занавес) | Н    | Сред. | dynamic+SSR включает CSS чанка в выдачу; проверка первого кадра каждого мира на его M-шаге; критические keyframes первого кадра можно поднять в `globals.css` точечно |
| R5  | Миниатюры Студии расходятся с реальными страницами             | С    | Низ.  | Миниатюра = тот же реестр (M8); до M8 — честные статичные силуэты без обещания точности                                                                               |
| R6  | Полумиграция: миры живут на алиасах дольше плана               | С    | Низ.  | Алиасы — легальное конечное состояние (миру не запрещено делиться композицией); burn-down в TASKS.md                                                                  |
| R7  | Классические ключи (`soft`, `poster`, старые темы) сломаны     | Н    | Выс.  | Алиас-таблица §8.1 покрывает все 8 ключей; fallback → soft; тест на `resolveBrandStyleKey`                                                                            |
| R8  | Overrides мастера перестают доезжать до какого-то мира         | Н    | Сред. | Запрет хардкода цвета в композициях (lint + ревью); визуальный прогон с overrides на M-шаге мира                                                                      |
| R9  | Регрессия плакатного мира — главного актива (аудит §7)         | Н    | Выс.  | M2 — чистый перенос без правок разметки; скриншот-сравнение до/после                                                                                                  |

### 13.3. Что осознанно НЕ делаем

- Не вводим state-manager (zustand присутствует в зависимостях, но машина
  записи — локальное состояние; хуков достаточно, добавлять слой — против
  KISS).
- Не разносим `engine` в отдельный пакет: граница держится импортами и
  lint-правилами; пакет — преждевременная церемония для одного потребителя.
- Не трогаем дашборд/кабинет: там один продуктовый мир, система стилей —
  территория публичной страницы.

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
   место — engine).
2. Маршруты и layout не содержат строковых ветвлений по `designPresetKey` —
   только `resolveBrandStyleKey` + реестр.
3. Добавление седьмого мира = новый каталог в `compositions/` + строка в
   реестре. Существующие файлы миров не правятся.
4. Монохром-тест: скриншоты шести миров в grayscale без изображений —
   различимы по композиции (проверка на M-шагах M5–M7).
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` зелёные на
   каждом шаге; бандл главного маршрута растёт не более чем на размер
   одного чанка мира.
